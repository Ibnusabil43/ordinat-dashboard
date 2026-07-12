/**
 * Shared ONGOING -> REKAP transition + RecapJob creation (BE-J1) — the one
 * place this happens, so the token-authenticated webhook (BE-E1, Flask's
 * "Mulai Rekap" flag) and the session-authenticated "Proses Otomatis"
 * button (BE-J2) can never drift apart in behavior.
 *
 * Result-returning, not throw-based — each caller maps `reason` to its own
 * surface (HTTP status code for the webhook, a plain error string for the
 * action), and the distinction between "event doesn't exist," "illegal
 * transition," and "write failed" matters to both.
 */
import { prisma } from "@/lib/prisma";
import { assertTransition } from "@/lib/status";

export type StartRekapResult =
  | { ok: true }
  | { ok: false; reason: "not_found" | "invalid_transition" | "db_error"; message: string };

export async function startRekap(eventId: string, triggeredBy: string): Promise<StartRekapResult> {
  const event = await prisma.psikotesEvent.findUnique({
    where: { id: eventId },
    select: { status: true },
  });
  if (!event) {
    return { ok: false, reason: "not_found", message: "Jadwal tidak ditemukan." };
  }

  try {
    assertTransition(event.status, "REKAP");
  } catch {
    return {
      ok: false,
      reason: "invalid_transition",
      message: `Transisi tidak sah dari status ${event.status} ke REKAP.`,
    };
  }

  try {
    await prisma.$transaction([
      prisma.psikotesEvent.update({ where: { id: eventId }, data: { status: "REKAP" } }),
      prisma.recapJob.create({ data: { eventId, triggeredBy } }),
    ]);
  } catch {
    return { ok: false, reason: "db_error", message: "Gagal memperbarui status." };
  }

  return { ok: true };
}
