import { z } from "zod";

export const guardrailsSchema = z.object({
  min_stock: z.number().default(5),
  max_campaigns_per_week: z.number().default(10),
  max_products_per_campaign: z.number().default(20),
  join_threshold: z.number().min(0).max(1).default(0.7),
  product_lookback_days: z.number().default(30),
  blacklist_skus: z.array(z.string()).default([]),
  discount_fatigue_days: z.number().default(14),
});

export type Guardrails = z.infer<typeof guardrailsSchema>;

export const DEFAULT_GUARDRAILS: Guardrails = {
  min_stock: 5,
  max_campaigns_per_week: 10,
  max_products_per_campaign: 20,
  join_threshold: 0.7,
  product_lookback_days: 30,
  blacklist_skus: [],
  discount_fatigue_days: 14,
};

export interface MasterCampaign {
  week: string;
  theme: string;
  discountType: string;
  startDate?: string;
  endDate?: string;
  status?: string;
  notes?: string;
  [key: string]: string | undefined;
}

export interface ActualWeekEntry {
  sku: string;
  campaign: string;
  week: string;
  [key: string]: string | undefined;
}

export interface ProductSalesRow {
  itemName: string;
  date: string;
  itemsViewed: number;
  itemsAddedToCart: number;
  itemsPurchased: number;
  itemRevenue: number;
}

export interface ProductScore {
  itemName: string;
  revenue30d: number;
  purchases30d: number;
  atcRate: number;
  recencyScore: number;
  brandStrength: number;
  totalScore: number;
}

export interface BrandSalesRow {
  itemBrand: string;
  itemsViewed: number;
  itemsAddedToCart: number;
  itemsPurchased: number;
  itemRevenue: number;
}

export interface FeedProduct {
  sku: string;
  name: string;
  category: string;
  brand: string;
  price: number;
  availability: string;
  url: string;
  stock?: number;
}

export interface CampaignInterpretation {
  id: string;
  theme: string;
  discountType: string;
  constraints: string[];
  priority: number;
  targetCategory?: string;
  targetBrand?: string;
  maxProducts: number;
}

export interface DataSignal {
  itemName: string;
  revenue30d: number;
  purchases30d: number;
  atcRate: number;
  recencyScore: number;
  brandStrength: number;
  compositeScore: number;
}

export interface ProductNomination {
  campaignId: string;
  sku: string;
  productName: string;
  reason: string;
  score: number;
  risks: string[];
}

export interface RiskFlag {
  sku: string;
  campaignId: string;
  type: "UNKNOWN_STOCK" | "UNKNOWN_MARGIN" | "DUPLICATE" | "LOW_JOIN_RATE" | "DISCOUNT_FATIGUE" | "BLACKLISTED";
  severity: "HIGH" | "MEDIUM" | "LOW";
  message: string;
}

export interface NominationRow {
  week: string;
  theme: string;
  discountType: string;
  sku: string;
  productName: string;
  reason: string;
  action: string;
  status: string;
  notes: string;
}

export interface PipelineResult {
  campaigns: CampaignInterpretation[];
  signals: DataSignal[];
  nominations: ProductNomination[];
  risks: RiskFlag[];
  finalRows: NominationRow[];
  stats: {
    campaignCount: number;
    productCount: number;
    joinRate: number;
    uniqueSkus: number;
  };
}

export interface RunConfig {
  clientId: string;
  weekStart: string;
  mode: "dry_run" | "generate_write";
}
