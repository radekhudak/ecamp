const { google } = require("googleapis");

const SERVICE_ACCOUNT_EMAIL = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
const PRIVATE_KEY = process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, "\n");
const SHARE_WITH_EMAIL = process.argv[2]; // user's email to share the sheet with

async function main() {
  const auth = new google.auth.JWT({
    email: SERVICE_ACCOUNT_EMAIL,
    key: PRIVATE_KEY,
    scopes: ["https://www.googleapis.com/auth/spreadsheets", "https://www.googleapis.com/auth/drive"],
  });

  const sheets = google.sheets({ version: "v4", auth });
  const drive = google.drive({ version: "v3", auth });

  // Create spreadsheet with 4 tabs
  const spreadsheet = await sheets.spreadsheets.create({
    requestBody: {
      properties: { title: "Campaign Planner - Template" },
      sheets: [
        { properties: { title: "Kampaně_vitalpoint", index: 0 } },
        { properties: { title: "NEXT WEEK (Nominace)", index: 1 } },
        { properties: { title: "ACTUAL WEEK (Live Přehled)", index: 2 } },
        { properties: { title: "RUN_LOG", index: 3 } },
      ],
    },
  });

  const spreadsheetId = spreadsheet.data.spreadsheetId;
  console.log(`Created spreadsheet: ${spreadsheetId}`);
  console.log(`URL: https://docs.google.com/spreadsheets/d/${spreadsheetId}`);

  // Generate 9 Mondays (this week + 8 weeks ahead)
  const today = new Date();
  const dayOfWeek = today.getDay();
  const monday = new Date(today);
  monday.setDate(today.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1));
  monday.setHours(0, 0, 0, 0);

  const weeks = [];
  for (let i = 0; i < 9; i++) {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i * 7);
    weeks.push(d.toISOString().split("T")[0]);
  }

  // MASTER tab
  const masterHeaders = [
    "Týden", "TÉMA (Zadaní)", "Typ pro slevu", "START", "KONEC",
    "STATUS", "Cílová kategorie", "Cílový brand", "Max produktů", "Poznámky"
  ];
  const masterRows = weeks.map((w) => [w, "", "", w, "", "PLANNED", "", "", "", ""]);

  await sheets.spreadsheets.values.update({
    spreadsheetId,
    range: "Kampaně_vitalpoint!A1",
    valueInputOption: "USER_ENTERED",
    requestBody: { values: [masterHeaders, ...masterRows] },
  });

  // NEXT WEEK tab
  const nextWeekHeaders = [
    "Týden", "TÉMA (Zadaní)", "Typ pro slevu", "SKU",
    "Název produktu", "Důvod", "AKCE", "STATUS", "Notes"
  ];

  await sheets.spreadsheets.values.update({
    spreadsheetId,
    range: "'NEXT WEEK (Nominace)'!A1",
    valueInputOption: "USER_ENTERED",
    requestBody: { values: [nextWeekHeaders] },
  });

  // ACTUAL WEEK tab
  const actualHeaders = [
    "Týden", "TÉMA (Zadaní)", "SKU", "Název produktu",
    "Typ pro slevu", "AKCE", "STATUS", "Notes"
  ];

  await sheets.spreadsheets.values.update({
    spreadsheetId,
    range: "'ACTUAL WEEK (Live Přehled)'!A1",
    valueInputOption: "USER_ENTERED",
    requestBody: { values: [actualHeaders] },
  });

  // RUN_LOG tab
  const runLogHeaders = [
    "run_id", "timestamp", "klient", "week_start",
    "počet kampaní", "počet produktů", "join rate", "hash", "status"
  ];

  await sheets.spreadsheets.values.update({
    spreadsheetId,
    range: "RUN_LOG!A1",
    valueInputOption: "USER_ENTERED",
    requestBody: { values: [runLogHeaders] },
  });

  // Share with user
  if (SHARE_WITH_EMAIL) {
    await drive.permissions.create({
      fileId: spreadsheetId,
      requestBody: {
        type: "user",
        role: "writer",
        emailAddress: SHARE_WITH_EMAIL,
      },
    });
    console.log(`Shared with ${SHARE_WITH_EMAIL}`);
  }

  // Now create Product Sales sheet
  const prodSpreadsheet = await sheets.spreadsheets.create({
    requestBody: {
      properties: { title: "Product Sales - Template" },
      sheets: [{ properties: { title: "Product Sales", index: 0 } }],
    },
  });

  const prodId = prodSpreadsheet.data.spreadsheetId;
  console.log(`\nProduct Sales sheet: ${prodId}`);
  console.log(`URL: https://docs.google.com/spreadsheets/d/${prodId}`);

  const productHeaders = [
    "Item name", "Date", "Items viewed", "Items added to cart",
    "Items purchased", "Item revenue"
  ];

  await sheets.spreadsheets.values.update({
    spreadsheetId: prodId,
    range: "'Product Sales'!A1",
    valueInputOption: "USER_ENTERED",
    requestBody: { values: [productHeaders] },
  });

  if (SHARE_WITH_EMAIL) {
    await drive.permissions.create({
      fileId: prodId,
      requestBody: { type: "user", role: "writer", emailAddress: SHARE_WITH_EMAIL },
    });
  }

  // Brand Sales sheet
  const brandSpreadsheet = await sheets.spreadsheets.create({
    requestBody: {
      properties: { title: "Brand Sales - Template" },
      sheets: [{ properties: { title: "Brand Sales", index: 0 } }],
    },
  });

  const brandId = brandSpreadsheet.data.spreadsheetId;
  console.log(`\nBrand Sales sheet: ${brandId}`);
  console.log(`URL: https://docs.google.com/spreadsheets/d/${brandId}`);

  const brandHeaders = [
    "Item brand", "Items viewed", "Items added to cart",
    "Items purchased", "Item revenue"
  ];

  await sheets.spreadsheets.values.update({
    spreadsheetId: brandId,
    range: "'Brand Sales'!A1",
    valueInputOption: "USER_ENTERED",
    requestBody: { values: [brandHeaders] },
  });

  if (SHARE_WITH_EMAIL) {
    await drive.permissions.create({
      fileId: brandId,
      requestBody: { type: "user", role: "writer", emailAddress: SHARE_WITH_EMAIL },
    });
  }

  console.log("\n=== SUMMARY ===");
  console.log(`Process Sheet ID: ${spreadsheetId}`);
  console.log(`Product Sales Sheet ID: ${prodId}`);
  console.log(`Brand Sales Sheet ID: ${brandId}`);
  console.log(`\nWeeks created: ${weeks.join(", ")}`);
}

main().catch(console.error);
