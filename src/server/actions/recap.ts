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
import { prisma } from "@/lib/prisma";
import { uploadOrUpdateFile } from "@/lib/google-sheets";
import { recapToolUrl, recapAuthHeader } from "@/lib/recap-proxy";
import { recapResultFilename } from "@/lib/format";

export async function triggerRekap(eventId: string): Promise<{ error?: string }> {
  const guard = await requireAdmin();
  if ("error" in guard) return { error: guard.error };

  const result = await startRekap(eventId, "Automated Recap");
  if (!result.ok) return { error: result.message };

  revalidatePath("/rekap");
  revalidatePath("/jadwal");
  revalidatePath(`/jadwal/${eventId}`);
  revalidatePath("/");
  return {};
}

/**
 * Uploads (or, on a re-run, updates in place) the finished recap result to
 * the one shared Drive results folder (BE-N2/N3) — called automatically
 * once a recap job reaches "done" (see RecapTool's status-polling effect).
 * A failure here is deliberately non-fatal to the caller's UI: the recap
 * itself already succeeded and the file is still downloadable manually
 * either way, so this only ever returns a distinct status for the Drive
 * part, never something that should block/hide the recap's own success.
 */
export async function uploadRecapResultToDrive(
  eventId: string,
  downloadFilename: string,
): Promise<{ error?: string; fileId?: string }> {
  const guard = await requireAdmin();
  if ("error" in guard) return { error: guard.error };

  const folderId = process.env.GOOGLE_DRIVE_RESULTS_FOLDER_ID;
  if (!folderId) return { error: "GOOGLE_DRIVE_RESULTS_FOLDER_ID belum diatur." };

  const event = await prisma.psikotesEvent.findUnique({
    where: { id: eventId },
    select: { driveResultFileId: true, scheduledDate: true, school: { select: { name: true } } },
  });
  if (!event) return { error: "Jadwal tidak ditemukan." };

  let bytes: Buffer;
  try {
    const res = await fetch(recapToolUrl(`/download/${encodeURIComponent(downloadFilename)}`), {
      headers: recapAuthHeader(),
    });
    if (!res.ok) return { error: "Gagal mengambil file hasil dari tool rekap." };
    bytes = Buffer.from(await res.arrayBuffer());
  } catch {
    return { error: "Tool rekap tidak bisa dihubungi." };
  }

  const filename = recapResultFilename(event.school.name, event.scheduledDate);

  try {
    const fileId = await uploadOrUpdateFile(folderId, filename, bytes, event.driveResultFileId);
    // First upload only actually changes anything here — a re-run passes the
    // same ID back in and writes the same value, harmless either way.
    await prisma.psikotesEvent.update({ where: { id: eventId }, data: { driveResultFileId: fileId } });
    return { fileId };
  } catch {
    return { error: "Gagal mengunggah hasil ke Drive." };
  }
}
