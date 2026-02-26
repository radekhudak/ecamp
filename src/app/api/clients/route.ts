import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { DEFAULT_GUARDRAILS } from "@/lib/types";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const clients = await prisma.client.findMany({
    where: { ownerId: session.user.id },
    include: {
      runs: {
        orderBy: { createdAt: "desc" },
        take: 1,
        select: { id: true, status: true, weekStart: true, createdAt: true },
      },
    },
    orderBy: { updatedAt: "desc" },
  });

  return NextResponse.json(clients);
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();

  const client = await prisma.client.create({
    data: {
      name: body.name,
      ownerId: session.user.id,
      processSheetId: body.processSheetId,
      masterTab: body.masterTab || "Kampaně_vitalpoint",
      nextWeekTab: body.nextWeekTab || "NEXT WEEK (Nominace)",
      actualWeekTab: body.actualWeekTab || "ACTUAL WEEK (Live Přehled)",
      runLogTab: body.runLogTab || "RUN_LOG",
      productSheetId: body.productSheetId,
      productTab: body.productTab,
      brandSheetId: body.brandSheetId,
      brandTab: body.brandTab,
      feedUrl: body.feedUrl || null,
      feedTagMapping: body.feedTagMapping || null,
      guardrails: body.guardrails || DEFAULT_GUARDRAILS,
    },
  });

  return NextResponse.json(client, { status: 201 });
}
