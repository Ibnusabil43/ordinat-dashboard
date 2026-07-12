"use server";

/**
 * Session-authenticated wrapper around startRekap() (BE-J2) — called when
 * an admin presses "Proses Otomatis" in Automated Recap, so picking a
 * school there does both the status transition and the file-processing job
 * in one click, without a separate manual status-changing step (PRD FR-9).
 *
 * Automated Recap is ADMIN-only (same restriction as Link Management/Rekap
 * Menu), so this uses requireAdmin(), not requireStaff().
 */
import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth-guard";
import { startRekap } from "@/lib/recap-status";

export async function triggerRekap(eventId: string): Promise<{ error?: string }> {
  const guard = await requireAdmin();
  if ("error" in guard) return { error: guard.error };

  const result = await startRekap(eventId, "Automated Recap");
  if (!result.ok) return { error: result.message };

  revalidatePath("/admin/rekap");
  revalidatePath("/admin/jadwal");
  revalidatePath(`/admin/jadwal/${eventId}`);
  revalidatePath("/admin");
  return {};
}
