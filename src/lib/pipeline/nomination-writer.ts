import { z } from "zod";
import { callLLMWithSchema } from "@/lib/openai";
import type {
  NominationRow,
  ProductNomination,
  CampaignInterpretation,
  RiskFlag,
} from "@/lib/types";
import {
  NOMINATION_WRITER_SYSTEM,
  buildNominationWriterPrompt,
} from "./prompts/nomination-writer";

const responseSchema = z.object({
  rows: z.array(
    z.object({
      week: z.string(),
      theme: z.string(),
      discountType: z.string(),
      sku: z.string(),
      productName: z.string(),
      reason: z.string(),
      action: z.string(),
      status: z.string(),
      notes: z.string(),
    })
  ),
});

export async function writeNominations(
  weekStart: string,
  nominations: ProductNomination[],
  campaigns: CampaignInterpretation[],
  risks: RiskFlag[]
): Promise<NominationRow[]> {
  const result = await callLLMWithSchema(
    {
      systemPrompt: NOMINATION_WRITER_SYSTEM,
      userPrompt: buildNominationWriterPrompt(
        weekStart,
        nominations,
        campaigns,
        risks
      ),
      model: "gpt-4o-mini",
      temperature: 0.1,
    },
    responseSchema
  );

  return result.rows.map((row) => ({
    ...row,
    status: "ČEKÁ NA SCHVÁLENÍ",
  }));
}
