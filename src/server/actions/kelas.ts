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

/**
 * Kelas is shown in two places now (Phase 19): the editable Classes manager
 * itself, and Monitoring's read-only "Kelas & Tester" tab (also feeds Cek
 * Nama's kelas-count dropdown) — both need refreshing on every write. The
 * Schedules event-detail "Tester" tab this used to also revalidate is gone
 * (FE-S2, moved to Classes), so the old per-event `/jadwal/${id}` loop is
 * gone too — Monitoring is keyed by schoolId directly, no event fan-out
 * needed.
 */
function revalidateKelasPaths(schoolId: string) {
  revalidatePath(`/classes/${schoolId}`);
  revalidatePath(`/monitoring/${schoolId}`);
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

  revalidateKelasPaths(schoolId);
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

  revalidateKelasPaths(schoolId);
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

  revalidateKelasPaths(schoolId);
  return {};
}
