"use server";

/**
 * Event lifecycle actions. markResume (REKAP→DONE) is Phase 7.
 *
 * Status is NEVER set through these actions except via assertTransition —
 * the state machine owns it. advanceToOngoing goes through assertTransition,
 * so an illegal jump is rejected server-side even if a stale UI offered the
 * button. See CLAUDE.md > Domain and Coding conventions.
 *
 * (User request, post-19-7): createEvent/updateEvent and their shared
 * eventSchema are gone — a school's PsikotesEvent is now always created
 * alongside the school itself (schools.ts's createSchool), never
 * standalone. The only remaining mutation here for scheduling is
 * updateEventDate, called from the inline date editor on the schedule's own
 * detail page (no separate route).
 */
import { prisma } from "@/lib/prisma";
import { scheduledDateSchema } from "@/lib/validations";
import { assertTransition } from "@/lib/status";
import { requireStaff, requireAdmin } from "@/lib/auth-guard";
import { revalidateEventPaths } from "@/lib/event-paths";

export interface UpdateEventDateState {
  error?: string;
}

/**
 * Sets or changes a schedule's date — the only field the inline editor on
 * the detail page can touch. Works the same whether the event currently has
 * no date ("Date not set yet") or is being rescheduled; status is untouched
 * either way.
 */
export async function updateEventDate(
  id: string,
  _prevState: UpdateEventDateState | undefined,
  formData: FormData,
): Promise<UpdateEventDateState> {
  const guard = await requireStaff();
  if ("error" in guard) return { error: guard.error };

  const parsed = scheduledDateSchema.safeParse(formData.get("scheduledDate"));
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  try {
    await prisma.psikotesEvent.update({
      where: { id },
      data: { scheduledDate: parsed.data },
    });
  } catch {
    return { error: "Failed to update schedule. Try again." };
  }

  revalidateEventPaths({ id });
  return {};
}

/**
 * SCHEDULED → ONGOING. The only forward transition an admin triggers in the
 * UI (markResume handles REKAP → DONE in Phase 7). Guarded by
 * assertTransition. Also requires a real scheduledDate — the UI already
 * hides "Mulai Psikotes" until a date is set (StartPsikotesButton's caller),
 * but this is the server-side half of that same guard, same defense-in-depth
 * pattern as every other action here.
 */
export async function advanceToOngoing(id: string): Promise<{ error?: string }> {
  const guard = await requireStaff();
  if ("error" in guard) return { error: guard.error };

  const event = await prisma.psikotesEvent.findUnique({
    where: { id },
    select: { status: true, scheduledDate: true },
  });
  if (!event) return { error: "Schedule not found." };
  if (!event.scheduledDate) return { error: "Set a test date before starting." };

  try {
    assertTransition(event.status, "ONGOING");
  } catch {
    return { error: "Schedule status can't be changed from its current state." };
  }

  try {
    await prisma.psikotesEvent.update({ where: { id }, data: { status: "ONGOING" } });
  } catch {
    return { error: "Failed to change status. Try again." };
  }

  revalidateEventPaths({ id });
  return {};
}

/**
 * REKAP → DONE (BE-C4). Called by the Rekap Menu's "Tandai Selesai" button.
 * Final and irreversible — no action moves status backward. Also closes the
 * open RecapJob (the one still missing a finishedAt) so the audit trail
 * records when recap actually finished.
 */
export async function markResume(id: string): Promise<{ error?: string }> {
  const guard = await requireAdmin();
  if ("error" in guard) return { error: guard.error };

  const event = await prisma.psikotesEvent.findUnique({
    where: { id },
    select: { status: true },
  });
  if (!event) return { error: "Schedule not found." };

  try {
    assertTransition(event.status, "DONE");
  } catch {
    return { error: "This schedule isn't currently in the recap stage." };
  }

  try {
    await prisma.$transaction([
      prisma.psikotesEvent.update({ where: { id }, data: { status: "DONE" } }),
      // updateMany (not update) — keyed on the open job, of which there should
      // be exactly one; tolerate zero without throwing.
      prisma.recapJob.updateMany({
        where: { eventId: id, finishedAt: null },
        data: { finishedAt: new Date() },
      }),
    ]);
  } catch {
    return { error: "Failed to complete recap. Try again." };
  }

  revalidateEventPaths({ id });
  return {};
}
