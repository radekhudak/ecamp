import { google, sheets_v4 } from "googleapis";
import crypto from "crypto";

function getAuth() {
  const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  const key = process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, "\n");

  if (!email || !key) {
    throw new Error("Google Service Account credentials not configured");
  }

  return new google.auth.JWT({
    email,
    key,
    scopes: ["https://www.googleapis.com/auth/spreadsheets"],
  });
}

function getSheetsClient(): sheets_v4.Sheets {
  return google.sheets({ version: "v4", auth: getAuth() });
}

export async function readSheetData(
  spreadsheetId: string,
  sheetName: string
): Promise<{ headers: string[]; rows: Record<string, string>[]; hash: string }> {
  const sheets = getSheetsClient();
  const response = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: sheetName,
    valueRenderOption: "UNFORMATTED_VALUE",
    dateTimeRenderOption: "FORMATTED_STRING",
  });

  const values = response.data.values;
  if (!values || values.length < 2) {
    return { headers: [], rows: [], hash: hashData([]) };
  }

  const headers = values[0].map(String);
  const rows = values.slice(1).map((row) => {
    const obj: Record<string, string> = {};
    headers.forEach((h, i) => {
      obj[h] = row[i] != null ? String(row[i]) : "";
    });
    return obj;
  });

  return { headers, rows, hash: hashData(values) };
}

export async function validateSheetAccess(
  spreadsheetId: string,
  sheetName: string,
  expectedColumns?: string[]
): Promise<{
  ok: boolean;
  title?: string;
  foundColumns?: string[];
  missingColumns?: string[];
  error?: string;
}> {
  try {
    const sheets = getSheetsClient();

    const meta = await sheets.spreadsheets.get({ spreadsheetId });
    const title = meta.data.properties?.title;

    const sheetExists = meta.data.sheets?.some(
      (s) => s.properties?.title === sheetName
    );
    if (!sheetExists) {
      return {
        ok: false,
        title: title ?? undefined,
        error: `Sheet tab "${sheetName}" not found. Available: ${meta.data.sheets?.map((s) => s.properties?.title).join(", ")}`,
      };
    }

    const headerResponse = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: `${sheetName}!1:1`,
    });

    const foundColumns = (headerResponse.data.values?.[0] ?? []).map(String);

    if (expectedColumns) {
      const missing = expectedColumns.filter(
        (c) => !foundColumns.includes(c)
      );
      return {
        ok: missing.length === 0,
        title: title ?? undefined,
        foundColumns,
        missingColumns: missing.length > 0 ? missing : undefined,
      };
    }

    return { ok: true, title: title ?? undefined, foundColumns };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return { ok: false, error: message };
  }
}

export async function appendRows(
  spreadsheetId: string,
  sheetName: string,
  rows: string[][]
): Promise<void> {
  const sheets = getSheetsClient();
  await sheets.spreadsheets.values.append({
    spreadsheetId,
    range: sheetName,
    valueInputOption: "USER_ENTERED",
    requestBody: { values: rows },
  });
}

export async function replaceWeekRows(
  spreadsheetId: string,
  sheetName: string,
  weekColumnName: string,
  weekValue: string,
  newRows: string[][],
  headers: string[]
): Promise<void> {
  const sheets = getSheetsClient();

  const existing = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: sheetName,
  });

  const allValues = existing.data.values ?? [];
  if (allValues.length === 0) {
    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: sheetName,
      valueInputOption: "USER_ENTERED",
      requestBody: { values: [headers, ...newRows] },
    });
    return;
  }

  const existingHeaders = allValues[0].map(String);
  const weekColIndex = existingHeaders.indexOf(weekColumnName);

  if (weekColIndex === -1) {
    await appendRows(spreadsheetId, sheetName, newRows);
    return;
  }

  const meta = await sheets.spreadsheets.get({ spreadsheetId });
  const sheet = meta.data.sheets?.find(
    (s) => s.properties?.title === sheetName
  );
  const sheetId = sheet?.properties?.sheetId;

  if (sheetId == null) {
    throw new Error(`Sheet "${sheetName}" not found`);
  }

  // Find rows to delete (from bottom up to preserve indices)
  const rowIndicesToDelete: number[] = [];
  for (let i = 1; i < allValues.length; i++) {
    if (String(allValues[i][weekColIndex] ?? "") === weekValue) {
      rowIndicesToDelete.push(i);
    }
  }

  if (rowIndicesToDelete.length > 0) {
    const requests = rowIndicesToDelete
      .sort((a, b) => b - a)
      .map((rowIndex) => ({
        deleteDimension: {
          range: {
            sheetId,
            dimension: "ROWS" as const,
            startIndex: rowIndex,
            endIndex: rowIndex + 1,
          },
        },
      }));

    await sheets.spreadsheets.batchUpdate({
      spreadsheetId,
      requestBody: { requests },
    });
  }

  if (newRows.length > 0) {
    await appendRows(spreadsheetId, sheetName, newRows);
  }
}

function hashData(data: unknown): string {
  return crypto.createHash("sha256").update(JSON.stringify(data)).digest("hex").slice(0, 16);
}
