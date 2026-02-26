import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { google } from "googleapis";

function getAuth() {
  const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  const key = process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, "\n");
  if (!email || !key) throw new Error("Google Service Account not configured");
  return new google.auth.JWT({
    email,
    key,
    scopes: ["https://www.googleapis.com/auth/spreadsheets"],
  });
}

const TAB_DEFINITIONS = [
  {
    name: "Kampaně_vitalpoint",
    headers: [
      "Týden", "TÉMA (Zadaní)", "Typ pro slevu", "START", "KONEC",
      "STATUS", "Cílová kategorie", "Cílový brand", "Max produktů", "Poznámky",
    ],
    generateWeeks: true,
  },
  {
    name: "NEXT WEEK (Nominace)",
    headers: [
      "Týden", "TÉMA (Zadaní)", "Typ pro slevu", "SKU",
      "Název produktu", "Důvod", "AKCE", "STATUS", "Notes",
    ],
  },
  {
    name: "ACTUAL WEEK (Live Přehled)",
    headers: [
      "Týden", "TÉMA (Zadaní)", "SKU", "Název produktu",
      "Typ pro slevu", "AKCE", "STATUS", "Notes",
    ],
  },
  {
    name: "RUN_LOG",
    headers: [
      "run_id", "timestamp", "klient", "week_start",
      "počet kampaní", "počet produktů", "join rate", "hash", "status",
    ],
  },
  {
    name: "Product Sales",
    headers: [
      "Item name", "Date", "Items viewed", "Items added to cart",
      "Items purchased", "Item revenue",
    ],
  },
  {
    name: "Brand Sales",
    headers: [
      "Item brand", "Items viewed", "Items added to cart",
      "Items purchased", "Item revenue",
    ],
  },
];

function generateWeekRows(): string[][] {
  const today = new Date();
  const day = today.getDay();
  const monday = new Date(today);
  monday.setDate(today.getDate() - day + (day === 0 ? -6 : 1));
  monday.setHours(0, 0, 0, 0);

  const rows: string[][] = [];
  for (let i = 0; i < 9; i++) {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i * 7);
    const week = d.toISOString().split("T")[0];
    rows.push([week, "", "", week, "", "PLANNED", "", "", "", ""]);
  }
  return rows;
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { spreadsheetId, tabOverrides } = await req.json();
  if (!spreadsheetId) {
    return NextResponse.json({ error: "spreadsheetId required" }, { status: 400 });
  }

  const jwtAuth = getAuth();
  const sheets = google.sheets({ version: "v4", auth: jwtAuth });

  try {
    const meta = await sheets.spreadsheets.get({ spreadsheetId });
    const existingTabs = new Set(
      meta.data.sheets?.map((s) => s.properties?.title) ?? []
    );

    const tabs = TAB_DEFINITIONS.map((def) => ({
      ...def,
      name: tabOverrides?.[def.name] || def.name,
    }));

    // Create missing tabs
    const tabsToCreate = tabs.filter((t) => !existingTabs.has(t.name));
    if (tabsToCreate.length > 0) {
      await sheets.spreadsheets.batchUpdate({
        spreadsheetId,
        requestBody: {
          requests: tabsToCreate.map((t) => ({
            addSheet: { properties: { title: t.name } },
          })),
        },
      });
    }

    // Write headers (and week rows for MASTER)
    const created: string[] = [];
    for (const tab of tabs) {
      const values: string[][] = [tab.headers];
      if (tab.generateWeeks) {
        values.push(...generateWeekRows());
      }

      await sheets.spreadsheets.values.update({
        spreadsheetId,
        range: `'${tab.name}'!A1`,
        valueInputOption: "USER_ENTERED",
        requestBody: { values },
      });
      created.push(tab.name);
    }

    // Delete default "Sheet1" if it exists and we created other tabs
    if (existingTabs.has("Sheet1") || existingTabs.has("List1")) {
      const refreshed = await sheets.spreadsheets.get({ spreadsheetId });
      const sheet1 = refreshed.data.sheets?.find(
        (s) => s.properties?.title === "Sheet1" || s.properties?.title === "List1"
      );
      if (sheet1?.properties?.sheetId != null && (refreshed.data.sheets?.length ?? 0) > 1) {
        await sheets.spreadsheets.batchUpdate({
          spreadsheetId,
          requestBody: {
            requests: [{ deleteSheet: { sheetId: sheet1.properties.sheetId } }],
          },
        }).catch(() => {});
      }
    }

    return NextResponse.json({
      ok: true,
      created,
      spreadsheetId,
      config: {
        processSheetId: spreadsheetId,
        masterTab: tabs[0].name,
        nextWeekTab: tabs[1].name,
        actualWeekTab: tabs[2].name,
        runLogTab: tabs[3].name,
        productSheetId: spreadsheetId,
        productTab: tabs[4].name,
        brandSheetId: spreadsheetId,
        brandTab: tabs[5].name,
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
