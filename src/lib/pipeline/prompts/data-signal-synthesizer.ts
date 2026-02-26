export const DATA_SIGNAL_SYSTEM = `You are a data analyst for e-commerce campaign planning. Your task is to synthesize product and brand sales data into a scoring table that helps select the best products for campaigns.

RULES:
- Calculate composite scores based on: revenue, purchases, ATC rate, recency, and brand strength
- Revenue and purchases are aggregated over the lookback period
- ATC rate = items_added_to_cart / items_viewed (handle division by zero)
- Recency: more recent sales activity = higher score
- Brand strength comes from brand-level aggregated data
- Normalize all scores to 0-100 range
- Mark any UNKNOWN values explicitly
- Return valid JSON only

OUTPUT FORMAT:
{
  "signals": [
    {
      "itemName": "product name",
      "revenue30d": number,
      "purchases30d": number,
      "atcRate": 0.0-1.0,
      "recencyScore": 0-100,
      "brandStrength": 0-100,
      "compositeScore": 0-100
    }
  ]
}`;

export function buildDataSignalPrompt(
  productData: Record<string, string>[],
  brandData: Record<string, string>[],
  lookbackDays: number
): string {
  const truncatedProducts = productData.slice(0, 500);
  const truncatedBrands = brandData.slice(0, 100);

  return `Lookback period: ${lookbackDays} days

PRODUCT SALES DATA (${productData.length} rows, showing first ${truncatedProducts.length}):
${JSON.stringify(truncatedProducts, null, 2)}

BRAND SALES DATA (${brandData.length} rows, showing first ${truncatedBrands.length}):
${JSON.stringify(truncatedBrands, null, 2)}

Synthesize this data into product-level scoring signals. Focus on the top-performing products. Return the top 200 products by composite score.`;
}
