import { revalidatePath } from "next/cache";

/**
 * Revalidate everything a PsikotesEvent status/date change can touch — the
 * admin list, rekap menu, overview counts, and (if given) the event's own
 * detail page. Shared by advanceToOngoing (BE-C3, manual "Mulai Psikotes")
 * and the advance-scheduled cron route (BE-I1), so the two paths lists can
 * never drift apart. Lives outside any "use server" file on purpose — a
 * "use server" file's exports must all be async Server Actions, and this
 * needs to be callable as a plain sync helper from a Route Handler too.
 */
export function revalidateEventPaths(opts: { id?: string } = {}) {
  revalidatePath("/admin/jadwal");
  revalidatePath("/admin/rekap");
  revalidatePath("/admin");
  if (opts.id) revalidatePath(`/admin/jadwal/${opts.id}`);
}
