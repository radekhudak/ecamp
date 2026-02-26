import { readSheetData } from "@/lib/google-sheets";
import { parseFeed, type FeedTagMapping, DEFAULT_FEED_MAPPING } from "@/lib/feed-parser";
import { parseGuardrails } from "@/lib/guardrails";
import { interpretCampaigns } from "./campaign-interpreter";
import { synthesizeDataSignals } from "./data-signal-synthesizer";
import { selectProducts } from "./product-selector";
import { auditRisks } from "./risk-auditor";
import { writeNominations } from "./nomination-writer";
import type {
  PipelineResult,
  FeedProduct,
  Guardrails,
} from "@/lib/types";

export interface PipelineInput {
  weekStart: string;
  processSheetId: string;
  masterTab: string;
  actualWeekTab: string;
  productSheetId: string;
  productTab: string;
  brandSheetId: string;
  brandTab: string;
  feedUrl?: string | null;
  feedTagMapping?: FeedTagMapping | null;
  guardrailsRaw: unknown;
}

export type PipelineStep =
  | "loading_data"
  | "interpreting_campaigns"
  | "synthesizing_signals"
  | "selecting_products"
  | "auditing_risks"
  | "writing_nominations"
  | "done";

export interface PipelineProgress {
  step: PipelineStep;
  message: string;
}

export async function runPipeline(
  input: PipelineInput,
  onProgress?: (progress: PipelineProgress) => void
): Promise<PipelineResult & { hashes: Record<string, string>; overallStatus: string }> {
  const guardrails: Guardrails = parseGuardrails(input.guardrailsRaw);
  const hashes: Record<string, string> = {};

  // Step 1: Load all data
  onProgress?.({ step: "loading_data", message: "Loading data from Google Sheets..." });

  const [masterData, actualWeekData, productData, brandData] = await Promise.all([
    readSheetData(input.processSheetId, input.masterTab),
    readSheetData(input.processSheetId, input.actualWeekTab),
    readSheetData(input.productSheetId, input.productTab),
    readSheetData(input.brandSheetId, input.brandTab),
  ]);

  hashes.master = masterData.hash;
  hashes.actualWeek = actualWeekData.hash;
  hashes.productSales = productData.hash;
  hashes.brandSales = brandData.hash;

  let feedProducts: FeedProduct[] | null = null;
  if (input.feedUrl) {
    try {
      const mapping = (input.feedTagMapping as FeedTagMapping) ?? DEFAULT_FEED_MAPPING;
      feedProducts = await parseFeed(input.feedUrl, mapping);
      hashes.feed = `${feedProducts.length}_products`;
    } catch (err) {
      console.error("Feed parsing failed:", err);
      hashes.feed = "FAILED";
    }
  }

  // Step 2: Campaign Interpreter
  onProgress?.({ step: "interpreting_campaigns", message: "Interpreting campaigns from MASTER..." });

  const campaigns = await interpretCampaigns(
    input.weekStart,
    masterData.rows,
    actualWeekData.rows,
    guardrails.max_campaigns_per_week
  );

  if (campaigns.length === 0) {
    return {
      campaigns: [],
      signals: [],
      nominations: [],
      risks: [],
      finalRows: [],
      stats: { campaignCount: 0, productCount: 0, joinRate: 0, uniqueSkus: 0 },
      hashes,
      overallStatus: "WARNING",
    };
  }

  // Step 3: Data Signal Synthesizer
  onProgress?.({ step: "synthesizing_signals", message: "Analyzing product sales data..." });

  const signals = await synthesizeDataSignals(
    productData.rows,
    brandData.rows,
    guardrails.product_lookback_days
  );

  // Step 4: Product Selector
  onProgress?.({ step: "selecting_products", message: "Selecting products for campaigns..." });

  const actualWeekSkus = actualWeekData.rows
    .map((r) => r["SKU"] || r["sku"] || "")
    .filter(Boolean);

  const nominations = await selectProducts(
    campaigns,
    signals,
    feedProducts,
    actualWeekSkus,
    guardrails
  );

  // Step 5: Risk Auditor
  onProgress?.({ step: "auditing_risks", message: "Auditing risks..." });

  const { risks, overallStatus } = await auditRisks(
    nominations,
    feedProducts,
    actualWeekSkus,
    guardrails.blacklist_skus
  );

  // Step 6: Nomination Writer
  onProgress?.({ step: "writing_nominations", message: "Formatting final nominations..." });

  const finalRows = await writeNominations(
    input.weekStart,
    nominations,
    campaigns,
    risks
  );

  // Calculate stats
  const uniqueSkus = new Set(nominations.map((n) => n.sku)).size;
  const totalSignalProducts = signals.length;
  const joinRate = totalSignalProducts > 0
    ? uniqueSkus / totalSignalProducts
    : 0;

  onProgress?.({ step: "done", message: "Pipeline complete" });

  return {
    campaigns,
    signals,
    nominations,
    risks,
    finalRows,
    stats: {
      campaignCount: campaigns.length,
      productCount: nominations.length,
      joinRate: Math.round(joinRate * 100) / 100,
      uniqueSkus,
    },
    hashes,
    overallStatus,
  };
}
