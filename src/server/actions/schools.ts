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

export interface SchoolActionState {
  error?: string;
  /** Field-level messages for inline display in the form. */
  fieldErrors?: { name?: string; slug?: string };
}

const DUPLICATE_SLUG_ERROR = "Slug sudah dipakai sekolah lain. Gunakan slug yang berbeda.";

/** True when Prisma rejected the write because of the unique constraint on `slug`. */
function isDuplicateSlug(e: unknown): boolean {
  return e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002";
}

function revalidateSchoolPaths() {
  revalidatePath("/sekolah");
}

/**
 * Phase 19 (FE-U1): the create form no longer bulk-creates kelas rows here —
 * that's exclusively a Classes-menu action now (/classes/[schoolId] →
 * createKelas, kelas.ts), done after the school already exists rather than
 * as a create-time shortcut on this form.
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

  const { name, slug, driveRawSheetId, driveFormFolderId } = parsed.data;
  const activeSubtests = parseActiveSubtests(formData);

  try {
    await prisma.school.create({
      data: { name, slug, driveRawSheetId, driveFormFolderId, activeSubtests },
    });
  } catch (e) {
    if (isDuplicateSlug(e)) return { fieldErrors: { slug: DUPLICATE_SLUG_ERROR } };
    return { error: "Gagal menyimpan sekolah. Coba lagi." };
  }

  revalidateSchoolPaths();
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
    return { error: "Gagal memperbarui sekolah. Coba lagi." };
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
    return { error: "Gagal menghapus sekolah. Coba lagi." };
  }

  revalidateSchoolPaths();
  return {};
}
