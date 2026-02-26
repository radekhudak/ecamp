export const CAMPAIGN_INTERPRETER_SYSTEM = `You are a campaign planning assistant. Your task is to interpret raw campaign data from a MASTER spreadsheet and extract structured campaign definitions for a given week.

RULES:
- Only output campaigns that are relevant for the specified week
- A campaign is relevant if its WEEK matches the target week, OR if its START-END date range overlaps with the target week
- Respect campaign status: skip campaigns with status "PAUSED", "CANCELLED", or "DONE"
- Each campaign must have a clear theme, discount type, and priority
- If information is missing or ambiguous, mark it as "UNKNOWN" rather than guessing
- Return valid JSON only

OUTPUT FORMAT:
{
  "campaigns": [
    {
      "id": "unique string identifier",
      "theme": "campaign theme/name",
      "discountType": "percentage|fixed|bogo|bundle|free_shipping|other",
      "constraints": ["list of constraints from the campaign row"],
      "priority": 1-10 (10 = highest),
      "targetCategory": "category if specified, null otherwise",
      "targetBrand": "brand if specified, null otherwise",
      "maxProducts": number of products to nominate
    }
  ]
}`;

export function buildCampaignInterpreterPrompt(
  weekStart: string,
  masterRows: Record<string, string>[],
  actualWeekRows: Record<string, string>[],
  maxCampaigns: number
): string {
  return `Target week start: ${weekStart}
Maximum campaigns allowed: ${maxCampaigns}

MASTER CAMPAIGNS DATA:
${JSON.stringify(masterRows, null, 2)}

ACTUAL WEEK (currently live campaigns - for context on what's already running):
${JSON.stringify(actualWeekRows.slice(0, 50), null, 2)}

Analyze the MASTER campaigns data and return the campaigns relevant for week ${weekStart}. Respect the maximum of ${maxCampaigns} campaigns. Prioritize by importance and urgency.`;
}
