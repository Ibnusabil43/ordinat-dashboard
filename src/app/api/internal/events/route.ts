/**
 * INTERNAL event picker (BE-E2) — lets the Flask recap tool list events so the
 * admin can pick one instead of typing a cuid. Same bearer-token auth as the
 * status webhook. GET /api/internal/events?status=ONGOING
 */
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { EVENT_STATUSES, type EventStatus } from "@/lib/status";
import { isValidRecapToken } from "@/lib/recap-auth";

export async function GET(request: Request) {
  if (!isValidRecapToken(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const statusParam = new URL(request.url).searchParams.get("status");
  // Default to ONGOING (the events eligible to enter recap); validate anything explicit.
  const status: EventStatus = EVENT_STATUSES.includes(statusParam as EventStatus)
    ? (statusParam as EventStatus)
    : "ONGOING";

  const events = await prisma.psikotesEvent.findMany({
    where: { status },
    orderBy: { scheduledDate: "desc" },
    select: {
      id: true,
      scheduledDate: true,
      school: { select: { name: true, slug: true } },
    },
  });

  return NextResponse.json({
    status,
    events: events.map((e) => ({
      id: e.id,
      school: e.school.name,
      slug: e.school.slug,
      scheduledDate: e.scheduledDate.toISOString().slice(0, 10),
    })),
  });
}
