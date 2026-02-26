import { replaceWeekRows, appendRows } from "@/lib/google-sheets";
import type { NominationRow } from "@/lib/types";

const NEXT_WEEK_HEADERS = [
  "Týden",
  "TÉMA (Zadaní)",
  "Typ pro slevu",
  "SKU",
  "Název produktu",
  "Důvod",
  "AKCE",
  "STATUS",
  "Notes",
];

export async function writeNominationsToSheet(
  spreadsheetId: string,
  sheetName: string,
  weekStart: string,
  rows: NominationRow[]
): Promise<void> {
  const sheetRows = rows.map((r) => [
    r.week,
    r.theme,
    r.discountType,
    r.sku,
    r.productName,
    r.reason,
    r.action,
    r.status,
    r.notes,
  ]);

  await replaceWeekRows(
    spreadsheetId,
    sheetName,
    "Týden",
    weekStart,
    sheetRows,
    NEXT_WEEK_HEADERS
  );
}

export async function writeRunLog(
  spreadsheetId: string,
  sheetName: string,
  log: {
    runId: string;
    timestamp: string;
    clientName: string;
    weekStart: string;
    campaignCount: number;
    productCount: number;
    joinRate: number;
    sheetsHash: string;
    status: string;
  }
): Promise<void> {
  await appendRows(spreadsheetId, sheetName, [
    [
      log.runId,
      log.timestamp,
      log.clientName,
      log.weekStart,
      String(log.campaignCount),
      String(log.productCount),
      String(log.joinRate),
      log.sheetsHash,
      log.status,
    ],
  ]);
}
