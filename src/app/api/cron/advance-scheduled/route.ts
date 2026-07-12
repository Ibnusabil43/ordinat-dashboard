/**
 * Vercel Cron target (BE-I1, vercel.json schedule in BE-I2) — flips every
 * event whose scheduledDate has arrived from SCHEDULED to ONGOING, so a
 * school doesn't sit at "Terjadwal" all morning waiting for someone to press
 * "Mulai Psikotes" by hand. The manual button (advanceToOngoing, BE-C3)
 * still exists as a fallback — this is purely additive.
 *
 * Vercel actually dispatches cron jobs via GET, not POST, despite the
 * story's "POST /api/cron/advance-scheduled" naming — both are wired to the
 * same handler here so the real Vercel trigger works AND `curl -X POST`
 * during local dev (per the phase checkpoint) works too.
 */
import { prisma } from "@/lib/prisma";
import { assertTransition } from "@/lib/status";
import { isValidCronRequest } from "@/lib/cron-auth";
import { revalidateEventPaths } from "@/lib/event-paths";

async function advanceScheduledEvents(request: Request): Promise<Response> {
  if (!isValidCronRequest(request)) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Date-only UTC "today" — scheduledDate is stored as UTC midnight (see
  // src/lib/format.ts), so compare dates, not full timestamps, or a school
  // scheduled for today would only flip after this instant's time-of-day.
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);

  const due = await prisma.psikotesEvent.findMany({
    where: { status: "SCHEDULED", scheduledDate: { lte: today } },
    select: { id: true },
  });

  let advanced = 0;
  for (const event of due) {
    try {
      // Always true given the query filter, but assertTransition is the one
      // source of truth for legal transitions — never bypass it.
      assertTransition("SCHEDULED", "ONGOING");
    } catch {
      continue;
    }

    await prisma.psikotesEvent.update({ where: { id: event.id }, data: { status: "ONGOING" } });
    revalidateEventPaths({ id: event.id });
    advanced++;
  }

  return Response.json({ advanced });
}

export async function GET(request: Request) {
  return advanceScheduledEvents(request);
}

export async function POST(request: Request) {
  return advanceScheduledEvents(request);
}
