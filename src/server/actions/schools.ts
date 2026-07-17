"use server";

/**
 * School CRUD (BE-B1–B3). Every action:
 *  1. checks the session and role (requireAdmin, tightened from requireStaff
 *     in Phase 19 — BE-P1: PIC_LAPANGAN loses School access entirely, Schools
 *     becomes ADMIN-only) — middleware is only the first layer,
 *  2. validates input with schoolSchema before touching Prisma,
 *  3. revalidates every path whose data changed.
 * See CLAUDE.md > Coding conventions.
 */
import { revalidatePath } from "next/cache";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { schoolSchema } from "@/lib/validations";
import { requireAdmin } from "@/lib/auth-guard";
import { parseActiveSubtests, resolveActiveSubtests, suggestTinyUrl } from "@/lib/constants";
import { revalidateEventPaths } from "@/lib/event-paths";

/**
 * Ensures a default tiny.cc link exists for every ACTIVE subtest of one
 * event (user request) — so a school's selected subtests are "already
 * linked" the moment it's created, instead of the form merely *showing* a
 * suggestion that was never saved (the old prefill trap that made Cek Link
 * report "belum ada link tersimpan" for links that looked filled).
 *
 * `createMany` + `skipDuplicates` means this only ever FILLS gaps — it never
 * overwrites a link that's already there (a manually-edited URL, or one from
 * a previous run), which is what makes it safe to call on both create and
 * update, and to backfill existing events with.
 *
 * Accepts a tx OR the base client (the full PrismaClient is assignable to
 * Prisma.TransactionClient), so it works inside createSchool's transaction
 * and standalone from updateSchool.
 */
async function ensureDefaultLinks(
  tx: Prisma.TransactionClient,
  eventId: string,
  slug: string,
  activeSubtests: string[],
): Promise<void> {
  const active = resolveActiveSubtests(activeSubtests);
  const subtestTypes = await tx.subtestType.findMany({ select: { id: true, code: true } });
  const idByCode = new Map(subtestTypes.map((s) => [s.code, s.id]));

  const data = active
    .map((s) => {
      const subtestTypeId = idByCode.get(s.code);
      return subtestTypeId ? { eventId, subtestTypeId, url: suggestTinyUrl(slug, s.code) } : null;
    })
    .filter((d): d is { eventId: string; subtestTypeId: string; url: string } => d !== null);

  if (data.length === 0) return;
  await tx.subtestLink.createMany({ data, skipDuplicates: true });
}

export interface SchoolActionState {
  error?: string;
  /** Field-level messages for inline display in the form. */
  fieldErrors?: { name?: string; slug?: string; scheduledDate?: string };
}

const DUPLICATE_SLUG_ERROR = "That slug is already used by another school. Choose a different one.";

/** True when Prisma rejected the write because of the unique constraint on `slug`. */
function isDuplicateSlug(e: unknown): boolean {
  return e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002";
}

function revalidateSchoolPaths() {
  revalidatePath("/sekolah");
}

/**
 * Optional create-time "test date" field (user request) — parses an
 * `<input type="date">` value into a `Date`, or `null` when left blank.
 * Blank is valid (not every school gets its first schedule at creation
 * time); a non-blank value that doesn't parse is a field error.
 */
function parseOptionalScheduledDate(formData: FormData): { date: Date | null; error?: string } {
  const raw = formData.get("scheduledDate");
  if (typeof raw !== "string" || raw.trim() === "") return { date: null };
  const date = new Date(raw);
  if (Number.isNaN(date.getTime())) return { date: null, error: "Invalid date" };
  return { date };
}

/**
 * Phase 19 (FE-U1): the create form no longer bulk-creates kelas rows here —
 * that's exclusively a Classes-menu action now (/classes/[schoolId] →
 * createKelas, kelas.ts), done after the school already exists rather than
 * as a create-time shortcut on this form.
 *
 * (User request, post-19-7, revised): every school now gets its
 * PsikotesEvent created right here, always — not conditional on the "Test
 * Date" field being filled in. There's no standalone "Add Schedule" flow
 * anymore (the Schedules menu's create route was removed), so this is the
 * only place an event is ever created; `scheduledDate` is simply `null`
 * when the field was left blank, shown as "Date not set yet" until it's set
 * from the schedule's own detail page (inline editor, no separate route).
 * `status` still defaults to SCHEDULED same as any other event — never set
 * explicitly, the state machine owns it (see CLAUDE.md > Domain).
 */
export async function createSchool(
  _prevState: SchoolActionState | undefined,
  formData: FormData,
): Promise<SchoolActionState> {
  const guard = await requireAdmin();
  if ("error" in guard) return { error: guard.error };

  const parsed = schoolSchema.safeParse({
    name: formData.get("name"),
    slug: formData.get("slug"),
    driveRawSheetId: formData.get("driveRawSheetId") ?? undefined,
    driveFormFolderId: formData.get("driveFormFolderId") ?? undefined,
  });
  if (!parsed.success) {
    const f = parsed.error.flatten().fieldErrors;
    return { fieldErrors: { name: f.name?.[0], slug: f.slug?.[0] } };
  }

  const { date: scheduledDate, error: dateError } = parseOptionalScheduledDate(formData);
  if (dateError) return { fieldErrors: { scheduledDate: dateError } };

  const { name, slug, driveRawSheetId, driveFormFolderId } = parsed.data;
  const activeSubtests = parseActiveSubtests(formData);

  try {
    await prisma.$transaction(async (tx) => {
      const school = await tx.school.create({
        data: { name, slug, driveRawSheetId, driveFormFolderId, activeSubtests },
      });
      const event = await tx.psikotesEvent.create({
        data: { schoolId: school.id, scheduledDate },
        select: { id: true },
      });
      // Auto-save the tiny.cc link for each active subtest, so the school is
      // "already linked" on creation (user request) rather than the form
      // just showing unsaved suggestions.
      await ensureDefaultLinks(tx, event.id, slug, activeSubtests);
    });
  } catch (e) {
    if (isDuplicateSlug(e)) return { fieldErrors: { slug: DUPLICATE_SLUG_ERROR } };
    return { error: "Failed to save school. Try again." };
  }

  revalidateSchoolPaths();
  revalidateEventPaths();
  revalidatePath("/links");
  return {};
}

export async function updateSchool(
  id: string,
  _prevState: SchoolActionState | undefined,
  formData: FormData,
): Promise<SchoolActionState> {
  const guard = await requireAdmin();
  if ("error" in guard) return { error: guard.error };

  const parsed = schoolSchema.safeParse({
    name: formData.get("name"),
    slug: formData.get("slug"),
    driveRawSheetId: formData.get("driveRawSheetId") ?? undefined,
    driveFormFolderId: formData.get("driveFormFolderId") ?? undefined,
  });
  if (!parsed.success) {
    const f = parsed.error.flatten().fieldErrors;
    return { fieldErrors: { name: f.name?.[0], slug: f.slug?.[0] } };
  }

  const activeSubtests = parseActiveSubtests(formData);

  try {
    // Prisma's unique constraint already excludes "no change" (a row keeps its
    // own slug), so a P2002 here genuinely means another school owns that slug.
    await prisma.school.update({
      where: { id },
      data: {
        name: parsed.data.name,
        slug: parsed.data.slug,
        driveRawSheetId: parsed.data.driveRawSheetId,
        driveFormFolderId: parsed.data.driveFormFolderId,
        activeSubtests,
      },
    });

    // Fill in default links for any subtest that's now active but has no link
    // yet (checking a previously-unchecked subtest, or an older school created
    // before links were auto-generated). skipDuplicates never touches an
    // existing/manually-edited link, and a deactivated subtest keeps its row
    // harmlessly — the form/check already hide it via resolveActiveSubtests.
    const events = await prisma.psikotesEvent.findMany({
      where: { schoolId: id },
      select: { id: true },
    });
    for (const ev of events) {
      await ensureDefaultLinks(prisma, ev.id, parsed.data.slug, activeSubtests);
    }
  } catch (e) {
    if (isDuplicateSlug(e)) return { fieldErrors: { slug: DUPLICATE_SLUG_ERROR } };
    return { error: "Failed to update school. Try again." };
  }

  revalidateSchoolPaths();
  revalidateEventPaths();
  revalidatePath("/links");
  return {};
}

/**
 * Deletes a school and — via `onDelete: Cascade` in the schema — all of its
 * events, subtest links, and recap jobs. The confirmation modal (FE-F3) must
 * warn about that cascade before calling this.
 */
export async function deleteSchool(id: string): Promise<{ error?: string }> {
  const guard = await requireAdmin();
  if ("error" in guard) return { error: guard.error };

  try {
    await prisma.school.delete({ where: { id } });
  } catch {
    return { error: "Failed to delete school. Try again." };
  }

  revalidateSchoolPaths();
  return {};
}
