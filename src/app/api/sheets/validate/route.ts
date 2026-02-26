import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { validateSheetAccess } from "@/lib/google-sheets";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const { spreadsheetId, sheetName, expectedColumns } = body;

  if (!spreadsheetId || !sheetName) {
    return NextResponse.json(
      { error: "spreadsheetId and sheetName are required" },
      { status: 400 }
    );
  }

  const result = await validateSheetAccess(
    spreadsheetId,
    sheetName,
    expectedColumns
  );

  return NextResponse.json(result);
}
