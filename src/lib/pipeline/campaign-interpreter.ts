import { z } from "zod";
import { callLLMWithSchema } from "@/lib/openai";
import type { CampaignInterpretation } from "@/lib/types";
import {
  CAMPAIGN_INTERPRETER_SYSTEM,
  buildCampaignInterpreterPrompt,
} from "./prompts/campaign-interpreter";

const responseSchema = z.object({
  campaigns: z.array(
    z.object({
      id: z.string(),
      theme: z.string(),
      discountType: z.string(),
      constraints: z.array(z.string()),
      priority: z.number().min(1).max(10),
      targetCategory: z.string().nullable().optional(),
      targetBrand: z.string().nullable().optional(),
      maxProducts: z.number().min(1),
    })
  ),
});

export async function interpretCampaigns(
  weekStart: string,
  masterRows: Record<string, string>[],
  actualWeekRows: Record<string, string>[],
  maxCampaigns: number
): Promise<CampaignInterpretation[]> {
  const result = await callLLMWithSchema(
    {
      systemPrompt: CAMPAIGN_INTERPRETER_SYSTEM,
      userPrompt: buildCampaignInterpreterPrompt(
        weekStart,
        masterRows,
        actualWeekRows,
        maxCampaigns
      ),
      model: "gpt-4o",
      temperature: 0.1,
    },
    responseSchema
  );

  return result.campaigns.map((c) => ({
    ...c,
    targetCategory: c.targetCategory ?? undefined,
    targetBrand: c.targetBrand ?? undefined,
  }));
}
