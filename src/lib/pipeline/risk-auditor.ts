import { z } from "zod";
import { callLLMWithSchema } from "@/lib/openai";
import type { RiskFlag, ProductNomination, FeedProduct } from "@/lib/types";
import {
  RISK_AUDITOR_SYSTEM,
  buildRiskAuditorPrompt,
} from "./prompts/risk-auditor";

const responseSchema = z.object({
  risks: z.array(
    z.object({
      sku: z.string(),
      campaignId: z.string(),
      type: z.enum([
        "UNKNOWN_STOCK",
        "UNKNOWN_MARGIN",
        "DUPLICATE",
        "LOW_JOIN_RATE",
        "DISCOUNT_FATIGUE",
        "BLACKLISTED",
      ]),
      severity: z.enum(["HIGH", "MEDIUM", "LOW"]),
      message: z.string(),
    })
  ),
  summary: z.object({
    totalRisks: z.number(),
    highCount: z.number(),
    mediumCount: z.number(),
    lowCount: z.number(),
    overallStatus: z.enum(["OK", "WARNING", "FAIL"]),
  }),
});

export async function auditRisks(
  nominations: ProductNomination[],
  feedProducts: FeedProduct[] | null,
  actualWeekSkus: string[],
  blacklistSkus: string[]
): Promise<{ risks: RiskFlag[]; overallStatus: string }> {
  const result = await callLLMWithSchema(
    {
      systemPrompt: RISK_AUDITOR_SYSTEM,
      userPrompt: buildRiskAuditorPrompt(
        nominations,
        feedProducts,
        actualWeekSkus,
        blacklistSkus
      ),
      model: "gpt-4o-mini",
      temperature: 0.1,
    },
    responseSchema
  );

  return {
    risks: result.risks,
    overallStatus: result.summary.overallStatus,
  };
}
