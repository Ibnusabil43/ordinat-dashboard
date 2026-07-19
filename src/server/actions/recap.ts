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
  if (!folderId) return { error: "GOOGLE_DRIVE_RESULTS_FOLDER_ID isn't set." };

  const event = await prisma.psikotesEvent.findUnique({
    where: { id: eventId },
    select: { driveResultFileId: true, scheduledDate: true, school: { select: { name: true } } },
  });
  if (!event) return { error: "Schedule not found." };
  // Recap only ever reaches "done" for an event that already has a real
  // date (advanceToOngoing requires one) — this is a defensive guard for
  // the type, not a real-world path.
  if (!event.scheduledDate) return { error: "This schedule doesn't have a test date yet." };

  let bytes: Buffer;
  try {
    const res = await fetch(recapToolUrl(`/download/${encodeURIComponent(downloadFilename)}`), {
      headers: recapAuthHeader(),
    });
    if (!res.ok) {
      console.error(
        `[uploadRecapResultToDrive] recap tool returned ${res.status} for event=${eventId} file=${downloadFilename}`,
      );
      return { error: "Failed to fetch the result file from the recap tool." };
    }
    bytes = Buffer.from(await res.arrayBuffer());
  } catch (e) {
    console.error(
      `[uploadRecapResultToDrive] couldn't reach the recap tool for event=${eventId} file=${downloadFilename}:`,
      e,
    );
    return { error: "Couldn't reach the recap tool." };
  }

  const filename = recapResultFilename(event.school.name, event.scheduledDate);

  try {
    const fileId = await uploadOrUpdateFile(folderId, filename, bytes, event.driveResultFileId);
    // First upload only actually changes anything here — a re-run passes the
    // same ID back in and writes the same value, harmless either way.
    await prisma.psikotesEvent.update({ where: { id: eventId }, data: { driveResultFileId: fileId } });
    return { fileId };
  } catch (e) {
    console.error(
      `[uploadRecapResultToDrive] Drive upload failed for event=${eventId} filename="${filename}":`,
      e,
    );
    return { error: "Failed to upload the result to Drive." };
  }
}
