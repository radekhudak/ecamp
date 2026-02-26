export const PRODUCT_SELECTOR_SYSTEM = `You are a product selection engine for e-commerce campaigns. Your task is to assign the best products to each campaign based on data signals, feed data, and guardrails.

HARD RULES (must be strictly enforced):
- SKU must exist in the product feed (if feed is provided)
- Product must NOT be out_of_stock
- Stock must be >= min_stock threshold (if stock data exists)
- Same SKU must NOT appear in multiple campaigns within the same week
- Blacklisted SKUs must be excluded
- Do NOT exceed max_products_per_campaign

SOFT SCORING FACTORS:
- Higher composite score = better candidate
- Match product category/brand to campaign target category/brand
- Penalize: UNKNOWN_STOCK, UNKNOWN_MARGIN
- Penalize products that appeared in ACTUAL WEEK (discount fatigue)

RULES:
- For each campaign, select products ranked by suitability
- Provide a clear reason for each selection
- Flag any risks or uncertainties
- Return valid JSON only

OUTPUT FORMAT:
{
  "nominations": [
    {
      "campaignId": "campaign id from interpreter",
      "sku": "product SKU",
      "productName": "product name",
      "reason": "why this product was selected",
      "score": 0-100,
      "risks": ["list of risk flags"]
    }
  ]
}`;

export function buildProductSelectorPrompt(
  campaigns: unknown[],
  signals: unknown[],
  feedProducts: unknown[] | null,
  actualWeekSkus: string[],
  guardrails: {
    min_stock: number;
    max_products_per_campaign: number;
    blacklist_skus: string[];
    discount_fatigue_days: number;
  }
): string {
  return `CAMPAIGNS TO FILL:
${JSON.stringify(campaigns, null, 2)}

PRODUCT SIGNALS (scored):
${JSON.stringify(signals, null, 2)}

${feedProducts ? `PRODUCT FEED (${feedProducts.length} products, showing first 300):\n${JSON.stringify(feedProducts.slice(0, 300), null, 2)}` : "NO PRODUCT FEED AVAILABLE - use product signals only"}

PRODUCTS IN CURRENT ACTUAL WEEK (discount fatigue - penalize these):
${JSON.stringify(actualWeekSkus)}

GUARDRAILS:
- Minimum stock: ${guardrails.min_stock}
- Max products per campaign: ${guardrails.max_products_per_campaign}
- Blacklisted SKUs: ${JSON.stringify(guardrails.blacklist_skus)}
- Discount fatigue lookback: ${guardrails.discount_fatigue_days} days

Select the best products for each campaign. Enforce all hard rules. No duplicate SKUs across campaigns.`;
}
