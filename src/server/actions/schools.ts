"use server";

/**
 * School CRUD (BE-B1–B3). Every action:
 *  1. checks the session (getCurrentUser) — middleware is only the first layer,
 *  2. validates input with schoolSchema before touching Prisma,
 *  3. revalidates every path whose data changed (admin list + public home).
 * See CLAUDE.md > Coding conventions.
 */
import { revalidatePath } from "next/cache";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { schoolSchema } from "@/lib/validations";
import { getCurrentUser, SESSION_EXPIRED_ERROR } from "@/lib/auth-guard";

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
  revalidatePath("/"); // public home lists schools too
}

export async function createSchool(
  _prevState: SchoolActionState | undefined,
  formData: FormData,
): Promise<SchoolActionState> {
  if (!(await getCurrentUser())) return { error: SESSION_EXPIRED_ERROR };

  const parsed = schoolSchema.safeParse({
    name: formData.get("name"),
    slug: formData.get("slug"),
  });
  if (!parsed.success) {
    const f = parsed.error.flatten().fieldErrors;
    return { fieldErrors: { name: f.name?.[0], slug: f.slug?.[0] } };
  }

  try {
    await prisma.school.create({ data: parsed.data });
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
  if (!(await getCurrentUser())) return { error: SESSION_EXPIRED_ERROR };

  const parsed = schoolSchema.safeParse({
    name: formData.get("name"),
    slug: formData.get("slug"),
  });
  if (!parsed.success) {
    const f = parsed.error.flatten().fieldErrors;
    return { fieldErrors: { name: f.name?.[0], slug: f.slug?.[0] } };
  }

  try {
    // Prisma's unique constraint already excludes "no change" (a row keeps its
    // own slug), so a P2002 here genuinely means another school owns that slug.
    await prisma.school.update({ where: { id }, data: parsed.data });
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
  if (!(await getCurrentUser())) return { error: SESSION_EXPIRED_ERROR };

  try {
    await prisma.school.delete({ where: { id } });
  } catch {
    return { error: "Gagal menghapus sekolah. Coba lagi." };
  }

  revalidateSchoolPaths();
  return {};
}
