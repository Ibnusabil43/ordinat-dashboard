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
import { schoolSchema, kelasNameSchema } from "@/lib/validations";
import { requireStaff } from "@/lib/auth-guard";
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
 * Kelas can be named right here at creation (FE-M3, revised) — the form
 * submits one `kelasName` field per row. Each is trimmed and blanks dropped,
 * so an accidental empty row never creates a nameless kelas; order follows
 * the submitted order. Names still stay fully editable later via "Kelola
 * Kelas". Absent entirely = create no kelas.
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
    driveRawSheetId: formData.get("driveRawSheetId") ?? undefined,
  });
  if (!parsed.success) {
    const f = parsed.error.flatten().fieldErrors;
    return { fieldErrors: { name: f.name?.[0], slug: f.slug?.[0] } };
  }

  const { name, slug, driveRawSheetId } = parsed.data;

  // Parse the kelas name rows, dropping blanks. Cap at 50, same ceiling the
  // old count-based field enforced.
  const kelasNames = formData
    .getAll("kelasName")
    .map((v) => (typeof v === "string" ? kelasNameSchema.safeParse(v) : null))
    .filter((r): r is { success: true; data: string } => Boolean(r?.success))
    .map((r) => r.data)
    .slice(0, 50);

  const activeSubtests = parseActiveSubtests(formData);

  try {
    await prisma.$transaction(async (tx) => {
      const school = await tx.school.create({
        data: { name, slug, driveRawSheetId, activeSubtests },
      });
      if (kelasNames.length > 0) {
        await tx.kelas.createMany({
          data: kelasNames.map((kelasName, i) => ({
            schoolId: school.id,
            name: kelasName,
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
