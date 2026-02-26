import { z } from "zod";
import { callLLMWithSchema } from "@/lib/openai";
import type { ProductNomination, CampaignInterpretation, DataSignal, FeedProduct, Guardrails } from "@/lib/types";
import {
  PRODUCT_SELECTOR_SYSTEM,
  buildProductSelectorPrompt,
} from "./prompts/product-selector";

const responseSchema = z.object({
  nominations: z.array(
    z.object({
      campaignId: z.string(),
      sku: z.string(),
      productName: z.string(),
      reason: z.string(),
      score: z.number(),
      risks: z.array(z.string()),
    })
  ),
});

export async function selectProducts(
  campaigns: CampaignInterpretation[],
  signals: DataSignal[],
  feedProducts: FeedProduct[] | null,
  actualWeekSkus: string[],
  guardrails: Guardrails
): Promise<ProductNomination[]> {
  const result = await callLLMWithSchema(
    {
      systemPrompt: PRODUCT_SELECTOR_SYSTEM,
      userPrompt: buildProductSelectorPrompt(
        campaigns,
        signals,
        feedProducts,
        actualWeekSkus,
        {
          min_stock: guardrails.min_stock,
          max_products_per_campaign: guardrails.max_products_per_campaign,
          blacklist_skus: guardrails.blacklist_skus,
          discount_fatigue_days: guardrails.discount_fatigue_days,
        }
      ),
      model: "gpt-4o",
      temperature: 0.2,
    },
    responseSchema
  );

  // Post-process: enforce hard rules that LLM might miss
  const usedSkus = new Set<string>();
  const blacklistSet = new Set(guardrails.blacklist_skus);
  const feedSkuSet = feedProducts ? new Set(feedProducts.map((p) => p.sku)) : null;

  return result.nominations.filter((nom) => {
    if (blacklistSet.has(nom.sku)) return false;
    if (usedSkus.has(nom.sku)) return false;
    if (feedSkuSet && !feedSkuSet.has(nom.sku)) return false;

    if (feedProducts) {
      const feedItem = feedProducts.find((p) => p.sku === nom.sku);
      if (feedItem) {
        if (feedItem.availability === "out_of_stock") return false;
        if (feedItem.stock != null && feedItem.stock < guardrails.min_stock) return false;
      }
    }

    usedSkus.add(nom.sku);
    return true;
  });
}
