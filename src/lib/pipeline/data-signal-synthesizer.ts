import { z } from "zod";
import { callLLMWithSchema } from "@/lib/openai";
import type { DataSignal } from "@/lib/types";
import {
  DATA_SIGNAL_SYSTEM,
  buildDataSignalPrompt,
} from "./prompts/data-signal-synthesizer";

const responseSchema = z.object({
  signals: z.array(
    z.object({
      itemName: z.string(),
      revenue30d: z.number(),
      purchases30d: z.number(),
      atcRate: z.number(),
      recencyScore: z.number(),
      brandStrength: z.number(),
      compositeScore: z.number(),
    })
  ),
});

export async function synthesizeDataSignals(
  productData: Record<string, string>[],
  brandData: Record<string, string>[],
  lookbackDays: number
): Promise<DataSignal[]> {
  const result = await callLLMWithSchema(
    {
      systemPrompt: DATA_SIGNAL_SYSTEM,
      userPrompt: buildDataSignalPrompt(productData, brandData, lookbackDays),
      model: "gpt-4o-mini",
      temperature: 0.1,
    },
    responseSchema
  );

  return result.signals;
}
