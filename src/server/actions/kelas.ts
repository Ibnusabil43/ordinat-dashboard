"use server";

/**
 * Kelas & tester CRUD (BE-G2). PIC_LAPANGAN is explicitly granted this one
 * (PRD FR-9), so every action here uses requireStaff() — not requireAdmin()
 * like Link Management/Rekap Menu/Automated Recap.
 *
 * Each field (name, tester) is submitted independently from an inline-edit
 * cell (FE-K2), so update takes whichever of the two is present rather than
 * requiring both — there's no single "save the form" moment.
 */
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { kelasNameSchema, kelasTesterSchema } from "@/lib/validations";
import { requireStaff } from "@/lib/auth-guard";

/** Kelas persists across events/years, so every event this school has ever had needs its Tester tab refreshed. */
async function revalidateKelasPaths(schoolId: string) {
  revalidatePath(`/admin/sekolah/${schoolId}/kelas`);
  const events = await prisma.psikotesEvent.findMany({ where: { schoolId }, select: { id: true } });
  for (const event of events) revalidatePath(`/admin/jadwal/${event.id}`);
}

export async function createKelas(schoolId: string, formData: FormData): Promise<{ error?: string }> {
  const guard = await requireStaff();
  if ("error" in guard) return { error: guard.error };

  const parsedName = kelasNameSchema.safeParse(formData.get("name"));
  if (!parsedName.success) return { error: parsedName.error.issues[0].message };

  const lastKelas = await prisma.kelas.findFirst({
    where: { schoolId },
    orderBy: { order: "desc" },
    select: { order: true },
  });

  try {
    await prisma.kelas.create({
      data: { schoolId, name: parsedName.data, order: (lastKelas?.order ?? -1) + 1 },
    });
  } catch {
    return { error: "Gagal menambah kelas. Coba lagi." };
  }

  await revalidateKelasPaths(schoolId);
  return {};
}

export async function updateKelas(id: string, formData: FormData): Promise<{ error?: string }> {
  const guard = await requireStaff();
  if ("error" in guard) return { error: guard.error };

  const data: { name?: string; tester?: string | null } = {};

  if (formData.has("name")) {
    const parsed = kelasNameSchema.safeParse(formData.get("name"));
    if (!parsed.success) return { error: parsed.error.issues[0].message };
    data.name = parsed.data;
  }
  if (formData.has("tester")) {
    data.tester = kelasTesterSchema.parse(formData.get("tester"));
  }

  let schoolId: string;
  try {
    const updated = await prisma.kelas.update({ where: { id }, data, select: { schoolId: true } });
    schoolId = updated.schoolId;
  } catch {
    return { error: "Gagal menyimpan kelas. Coba lagi." };
  }

  await revalidateKelasPaths(schoolId);
  return {};
}

export async function deleteKelas(id: string): Promise<{ error?: string }> {
  const guard = await requireStaff();
  if ("error" in guard) return { error: guard.error };

  let schoolId: string;
  try {
    const deleted = await prisma.kelas.delete({ where: { id }, select: { schoolId: true } });
    schoolId = deleted.schoolId;
  } catch {
    return { error: "Gagal menghapus kelas. Coba lagi." };
  }

  await revalidateKelasPaths(schoolId);
  return {};
}
