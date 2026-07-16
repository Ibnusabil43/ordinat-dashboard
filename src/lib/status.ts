/**
 * Status lifecycle for PsikotesEvent — the SINGLE source of truth.
 * Never hardcode a status string elsewhere; import from here.
 *
 * Flow: SCHEDULED -> ONGOING -> REKAP -> DONE (one direction only, never backward).
 */

export const EVENT_STATUSES = ["SCHEDULED", "ONGOING", "REKAP", "DONE"] as const;
export type EventStatus = (typeof EVENT_STATUSES)[number];

/** Label shown in the UI (English — see CLAUDE.md > Coding conventions). */
export const STATUS_LABEL: Record<EventStatus, string> = {
  SCHEDULED: "Scheduled",
  ONGOING: "Testing in Progress",
  REKAP: "Recap Stage",
  DONE: "Completed",
};

/**
 * Monochrome visual representation. Status is distinguished by grayscale
 * intensity + icon, NOT hue (see the design system in CLAUDE.md).
 * `icon` refers to a lucide-react icon name.
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

/** Stage order for the progress stepper. */
export const STATUS_ORDER: EventStatus[] = [...EVENT_STATUSES];

/** Allowed transitions. Key = current status, value = legal destination statuses. */
const ALLOWED_TRANSITIONS: Record<EventStatus, EventStatus[]> = {
  SCHEDULED: ["ONGOING"],
  ONGOING: ["REKAP"],
  REKAP: ["DONE"],
  DONE: [],
};

export function canTransition(from: EventStatus, to: EventStatus): boolean {
  return ALLOWED_TRANSITIONS[from]?.includes(to) ?? false;
}

/** Throws if the transition isn't legal — used by server actions & the internal webhook. */
export function assertTransition(from: EventStatus, to: EventStatus): void {
  if (!canTransition(from, to)) {
    throw new Error(
      `Invalid status transition: ${from} -> ${to}. ` +
        `Flow must go SCHEDULED -> ONGOING -> REKAP -> DONE.`,
    );
  }
}

/** Progress 0..3 for the stepper. */
export function statusIndex(status: EventStatus): number {
  return STATUS_ORDER.indexOf(status);
}
