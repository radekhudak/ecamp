import OpenAI from "openai";
import { z } from "zod";

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export interface LLMCallOptions {
  systemPrompt: string;
  userPrompt: string;
  model?: "gpt-4o" | "gpt-4o-mini";
  temperature?: number;
  maxRetries?: number;
}

export async function callLLMWithSchema<T>(
  options: LLMCallOptions,
  schema: z.ZodType<T>
): Promise<T> {
  const {
    systemPrompt,
    userPrompt,
    model = "gpt-4o-mini",
    temperature = 0.2,
    maxRetries = 2,
  } = options;

  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const response = await client.chat.completions.create({
        model,
        temperature,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
      });

      const content = response.choices[0]?.message?.content;
      if (!content) {
        throw new Error("Empty response from LLM");
      }

      const parsed = JSON.parse(content);
      return schema.parse(parsed);
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));
      if (attempt < maxRetries) {
        await new Promise((r) => setTimeout(r, 1000 * (attempt + 1)));
      }
    }
  }

  throw new Error(
    `LLM call failed after ${maxRetries + 1} attempts: ${lastError?.message}`
  );
}
