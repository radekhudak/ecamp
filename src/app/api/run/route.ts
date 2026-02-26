import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { runPipeline } from "@/lib/pipeline";
import { writeNominationsToSheet, writeRunLog } from "@/lib/sheets-writer";
import type { FeedTagMapping } from "@/lib/feed-parser";

export const maxDuration = 120;

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const { clientId, weekStart, mode } = body;

  if (!clientId || !weekStart || !mode) {
    return NextResponse.json(
      { error: "clientId, weekStart, and mode are required" },
      { status: 400 }
    );
  }

  if (!["dry_run", "generate_write"].includes(mode)) {
    return NextResponse.json(
      { error: "mode must be dry_run or generate_write" },
      { status: 400 }
    );
  }

  const client = await prisma.client.findFirst({
    where: { id: clientId, ownerId: session.user.id },
  });

  if (!client) {
    return NextResponse.json({ error: "Client not found" }, { status: 404 });
  }

  try {
    const result = await runPipeline({
      weekStart,
      processSheetId: client.processSheetId,
      masterTab: client.masterTab,
      actualWeekTab: client.actualWeekTab,
      productSheetId: client.productSheetId,
      productTab: client.productTab,
      brandSheetId: client.brandSheetId,
      brandTab: client.brandTab,
      feedUrl: client.feedUrl,
      feedTagMapping: client.feedTagMapping as FeedTagMapping | null,
      guardrailsRaw: client.guardrails,
    });

    // Write to Google Sheet if not dry run
    if (mode === "generate_write") {
      await writeNominationsToSheet(
        client.processSheetId,
        client.nextWeekTab,
        weekStart,
        result.finalRows
      );

      await writeRunLog(client.processSheetId, client.runLogTab, {
        runId: `run_${Date.now()}`,
        timestamp: new Date().toISOString(),
        clientName: client.name,
        weekStart,
        campaignCount: result.stats.campaignCount,
        productCount: result.stats.productCount,
        joinRate: result.stats.joinRate,
        sheetsHash: JSON.stringify(result.hashes),
        status: result.overallStatus,
      });
    }

    // Save run to database
    const run = await prisma.run.create({
      data: {
        clientId: client.id,
        weekStart: new Date(weekStart),
        mode,
        campaignCount: result.stats.campaignCount,
        productCount: result.stats.productCount,
        joinRate: result.stats.joinRate,
        sheetsHash: result.hashes,
        status: result.overallStatus,
        result: JSON.parse(JSON.stringify({
          campaigns: result.campaigns,
          nominations: result.nominations,
          risks: result.risks,
          finalRows: result.finalRows,
          stats: result.stats,
        })),
      },
    });

    return NextResponse.json({
      runId: run.id,
      mode,
      ...result,
    });
  } catch (err) {
    console.error("Pipeline error:", err);

    await prisma.run.create({
      data: {
        clientId: client.id,
        weekStart: new Date(weekStart),
        mode,
        status: "FAIL",
        logs: {
          error: err instanceof Error ? err.message : String(err),
        },
      },
    });

    return NextResponse.json(
      {
        error: "Pipeline failed",
        details: err instanceof Error ? err.message : String(err),
      },
      { status: 500 }
    );
  }
}
