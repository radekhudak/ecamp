import { guardrailsSchema, DEFAULT_GUARDRAILS, type Guardrails } from "./types";

export function parseGuardrails(raw: unknown): Guardrails {
  if (!raw || typeof raw !== "object") {
    return DEFAULT_GUARDRAILS;
  }
  try {
    return guardrailsSchema.parse(raw);
  } catch {
    return DEFAULT_GUARDRAILS;
  }
}

export function mergeGuardrails(
  base: Guardrails,
  overrides: Partial<Guardrails>
): Guardrails {
  return guardrailsSchema.parse({ ...base, ...overrides });
}
