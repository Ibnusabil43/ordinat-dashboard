"use server";

/**
 * School CRUD (BE-B1–B3). Every action:
 *  1. checks the session and role (requireStaff) — middleware is only the first layer,
 *  2. validates input with schoolSchema before touching Prisma,
 *  3. revalidates every path whose data changed.
 * See CLAUDE.md > Coding conventions.
 */
import { revalidatePath } from "next/cache";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { schoolSchema } from "@/lib/validations";
import { requireStaff } from "@/lib/auth-guard";

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
  revalidatePath("/admin/sekolah");
}

/**
 * kelasCount (BE-G4) is a bulk-create shortcut, not a School field — it never
 * gets passed to prisma.school.create/update directly, always destructured
 * out first so an extra key never reaches a Prisma call that doesn't expect it.
 */
export async function createSchool(
  _prevState: SchoolActionState | undefined,
  formData: FormData,
): Promise<SchoolActionState> {
  const guard = await requireStaff();
  if ("error" in guard) return { error: guard.error };

  const parsed = schoolSchema.safeParse({
    name: formData.get("name"),
    slug: formData.get("slug"),
    kelasCount: formData.get("kelasCount") || undefined,
    driveRawSheetId: formData.get("driveRawSheetId") ?? undefined,
  });
  if (!parsed.success) {
    const f = parsed.error.flatten().fieldErrors;
    return { fieldErrors: { name: f.name?.[0], slug: f.slug?.[0] } };
  }

  const { name, slug, kelasCount, driveRawSheetId } = parsed.data;

  try {
    await prisma.$transaction(async (tx) => {
      const school = await tx.school.create({ data: { name, slug, driveRawSheetId } });
      if (kelasCount && kelasCount > 0) {
        await tx.kelas.createMany({
          data: Array.from({ length: kelasCount }, (_, i) => ({
            schoolId: school.id,
            name: `Kelas ${i + 1}`,
            order: i,
          })),
        });
      }
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
  const guard = await requireStaff();
  if ("error" in guard) return { error: guard.error };

  const parsed = schoolSchema.safeParse({
    name: formData.get("name"),
    slug: formData.get("slug"),
    driveRawSheetId: formData.get("driveRawSheetId") ?? undefined,
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
  const guard = await requireStaff();
  if ("error" in guard) return { error: guard.error };

  try {
    await prisma.school.delete({ where: { id } });
  } catch {
    return { error: "Gagal menghapus sekolah. Coba lagi." };
  }

  revalidateSchoolPaths();
  return {};
}
