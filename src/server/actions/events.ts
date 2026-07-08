"use server";

/**
 * Event lifecycle actions (BE-C1–C3). markResume (REKAP→DONE) is Phase 7.
 *
 * Status is NEVER set through create/update — the state machine owns it.
 * advanceToOngoing goes through assertTransition, so an illegal jump is
 * rejected server-side even if a stale UI offered the button.
 * See CLAUDE.md > Domain and Coding conventions.
 */
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { eventSchema } from "@/lib/validations";
import { assertTransition } from "@/lib/status";
import { getCurrentUser, SESSION_EXPIRED_ERROR } from "@/lib/auth-guard";

export interface EventActionState {
  error?: string;
  fieldErrors?: { schoolId?: string; scheduledDate?: string };
}

/**
 * Revalidate everything an event change can touch: the admin list, the admin
 * detail, the admin overview counts, the public home, and — when we know it —
 * the public school detail page.
 */
function revalidateEventPaths(opts: { id?: string; slug?: string } = {}) {
  revalidatePath("/admin/jadwal");
  revalidatePath("/admin");
  revalidatePath("/");
  if (opts.id) revalidatePath(`/admin/jadwal/${opts.id}`);
  if (opts.slug) revalidatePath(`/sekolah/${opts.slug}`);
}

function parseEvent(formData: FormData) {
  return eventSchema.safeParse({
    schoolId: formData.get("schoolId"),
    scheduledDate: formData.get("scheduledDate"),
  });
}

function fieldErrorsFrom(parsed: ReturnType<typeof parseEvent>): EventActionState {
  if (parsed.success) return {};
  const f = parsed.error.flatten().fieldErrors;
  return { fieldErrors: { schoolId: f.schoolId?.[0], scheduledDate: f.scheduledDate?.[0] } };
}

export async function createEvent(
  _prevState: EventActionState | undefined,
  formData: FormData,
): Promise<EventActionState> {
  if (!(await getCurrentUser())) return { error: SESSION_EXPIRED_ERROR };

  const parsed = parseEvent(formData);
  if (!parsed.success) return fieldErrorsFrom(parsed);

  try {
    // status defaults to SCHEDULED in the schema — not set here on purpose.
    await prisma.psikotesEvent.create({ data: parsed.data });
  } catch {
    return { error: "Gagal menyimpan jadwal. Coba lagi." };
  }

  revalidateEventPaths();
  return {};
}

export async function updateEvent(
  id: string,
  _prevState: EventActionState | undefined,
  formData: FormData,
): Promise<EventActionState> {
  if (!(await getCurrentUser())) return { error: SESSION_EXPIRED_ERROR };

  const parsed = parseEvent(formData);
  if (!parsed.success) return fieldErrorsFrom(parsed);

  try {
    // Only schoolId + scheduledDate change here; status is untouched.
    const updated = await prisma.psikotesEvent.update({
      where: { id },
      data: parsed.data,
      select: { school: { select: { slug: true } } },
    });
    revalidateEventPaths({ id, slug: updated.school.slug });
  } catch {
    return { error: "Gagal memperbarui jadwal. Coba lagi." };
  }

  return {};
}

/**
 * SCHEDULED → ONGOING. The only forward transition an admin triggers in the UI
 * (markResume handles REKAP → DONE in Phase 7). Guarded by assertTransition.
 */
export async function advanceToOngoing(id: string): Promise<{ error?: string }> {
  if (!(await getCurrentUser())) return { error: SESSION_EXPIRED_ERROR };

  const event = await prisma.psikotesEvent.findUnique({
    where: { id },
    select: { status: true, school: { select: { slug: true } } },
  });
  if (!event) return { error: "Jadwal tidak ditemukan." };

  try {
    assertTransition(event.status, "ONGOING");
  } catch {
    return { error: "Status jadwal tidak bisa diubah dari kondisi saat ini." };
  }

  try {
    await prisma.psikotesEvent.update({ where: { id }, data: { status: "ONGOING" } });
  } catch {
    return { error: "Gagal mengubah status. Coba lagi." };
  }

  revalidateEventPaths({ id, slug: event.school.slug });
  return {};
}
