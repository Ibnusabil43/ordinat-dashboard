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
import { parseActiveSubtests } from "@/lib/constants";
import { revalidateEventPaths } from "@/lib/event-paths";

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
      await tx.psikotesEvent.create({ data: { schoolId: school.id, scheduledDate } });
    });
  } catch (e) {
    if (isDuplicateSlug(e)) return { fieldErrors: { slug: DUPLICATE_SLUG_ERROR } };
    return { error: "Failed to save school. Try again." };
  }

  revalidateSchoolPaths();
  revalidateEventPaths();
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
        activeSubtests: parseActiveSubtests(formData),
      },
    });
  } catch (e) {
    if (isDuplicateSlug(e)) return { fieldErrors: { slug: DUPLICATE_SLUG_ERROR } };
    return { error: "Failed to update school. Try again." };
  }

  revalidateSchoolPaths();
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
