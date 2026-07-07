/**
 * Status lifecycle untuk PsikotesEvent — SATU-SATUNYA sumber kebenaran.
 * Jangan hardcode string status di tempat lain; impor dari sini.
 *
 * Alur: SCHEDULED -> ONGOING -> REKAP -> DONE (maju satu arah, tidak boleh mundur).
 */

export const EVENT_STATUSES = ["SCHEDULED", "ONGOING", "REKAP", "DONE"] as const;
export type EventStatus = (typeof EVENT_STATUSES)[number];

/** Label bahasa Indonesia yang tampil di UI. */
export const STATUS_LABEL: Record<EventStatus, string> = {
  SCHEDULED: "Terjadwal",
  ONGOING: "Sedang Psikotes",
  REKAP: "Tahap Rekap",
  DONE: "Tahap Resume",
};

/**
 * Representasi visual monokrom. Status TIDAK dibedakan lewat hue,
 * melainkan intensitas abu-abu + ikon (lihat design system di CLAUDE.md).
 * `icon` mengacu ke nama ikon lucide-react.
 */
export const STATUS_STYLE: Record<
  EventStatus,
  { fill: string; text: string; icon: string }
> = {
  SCHEDULED: { fill: "bg-zinc-100", text: "text-zinc-600", icon: "Circle" },
  ONGOING: { fill: "bg-zinc-300", text: "text-zinc-900", icon: "CircleDot" },
  REKAP: { fill: "bg-zinc-500", text: "text-white", icon: "RefreshCw" },
  DONE: { fill: "bg-zinc-900", text: "text-white", icon: "CheckCheck" },
};

/** Urutan tahap untuk progress stepper. */
export const STATUS_ORDER: EventStatus[] = [...EVENT_STATUSES];

/** Transisi yang diizinkan. Kunci = status sekarang, nilai = status tujuan yang sah. */
const ALLOWED_TRANSITIONS: Record<EventStatus, EventStatus[]> = {
  SCHEDULED: ["ONGOING"],
  ONGOING: ["REKAP"],
  REKAP: ["DONE"],
  DONE: [],
};

export function canTransition(from: EventStatus, to: EventStatus): boolean {
  return ALLOWED_TRANSITIONS[from]?.includes(to) ?? false;
}

/** Melempar error kalau transisi tidak sah — dipakai di server action & webhook internal. */
export function assertTransition(from: EventStatus, to: EventStatus): void {
  if (!canTransition(from, to)) {
    throw new Error(
      `Transisi status tidak sah: ${from} -> ${to}. ` +
        `Alur wajib SCHEDULED -> ONGOING -> REKAP -> DONE.`,
    );
  }
}

/** Progress 0..3 untuk stepper. */
export function statusIndex(status: EventStatus): number {
  return STATUS_ORDER.indexOf(status);
}
