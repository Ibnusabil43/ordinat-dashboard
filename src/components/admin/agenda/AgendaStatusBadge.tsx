import { Circle, CircleDot, RefreshCw, CheckCheck, type LucideIcon } from "lucide-react";
import { clsx } from "clsx";
import { STATUS_LABEL, type EventStatus } from "@/lib/status";

const ICONS: Record<EventStatus, LucideIcon> = {
  SCHEDULED: Circle,
  ONGOING: CircleDot,
  REKAP: RefreshCw,
  DONE: CheckCheck,
};

/**
 * Scoped color exception (Phase 19, DESIGN.md §2) — Agenda is one of three
 * confirmed exceptions to the grayscale-only status rule, alongside Cek Nama
 * and the Overview charts. Local classes only, never new `--color-*` tokens
 * in globals.css — StatusBadge/ProgressStepper everywhere else in the app
 * stay grayscale-only, this isn't a precedent for them.
 */
const AGENDA_STATUS_COLOR: Record<EventStatus, string> = {
  SCHEDULED: "bg-zinc-100 text-zinc-600", // neutral — still no hue, matches STATUS_STYLE's own tone
  ONGOING: "bg-blue-500 text-white",
  REKAP: "bg-amber-500 text-white",
  DONE: "bg-emerald-600 text-white",
};

export function AgendaStatusBadge({ status }: { status: EventStatus }) {
  const Icon = ICONS[status];
  return (
    <span
      className={clsx(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium",
        AGENDA_STATUS_COLOR[status],
      )}
    >
      <Icon
        aria-hidden="true"
        size={14}
        className={status === "ONGOING" ? "animate-pulse" : undefined}
      />
      {STATUS_LABEL[status]}
    </span>
  );
}
