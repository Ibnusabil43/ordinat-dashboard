import { clsx } from "clsx";
import { CalendarRange, CalendarClock, CalendarDays, History } from "lucide-react";
import { getAgendaEvents, type AgendaEventItem } from "@/lib/queries/events";
import { groupAgendaEvents, relativeDayLabel } from "@/lib/agenda";
import { PageHeader } from "@/components/admin/PageHeader";
import { EmptyState } from "@/components/EmptyState";
import { AgendaStatusBadge } from "@/components/admin/agenda/AgendaStatusBadge";
import type { EventStatus } from "@/lib/status";

/**
 * Redesign (user request, ui-ux-pro-max consulted) — the original was
 * uniform white cards with a plain text date. Two changes carry the
 * "timeline" feel without breaking the monochrome rule: a calendar-day
 * tile (day number + month, like a real desk calendar page) replaces the
 * plain date line, and a thin left accent border reuses the same status hue
 * as the badge (AGENDA_STATUS_COLOR is already a confirmed scoped
 * exception — this just extends its use to the row itself, not a new one).
 */
const ROW_ACCENT: Record<EventStatus, string> = {
  SCHEDULED: "border-l-zinc-300",
  ONGOING: "border-l-blue-500",
  REKAP: "border-l-amber-500",
  DONE: "border-l-emerald-600",
};

function DateTile({ date }: { date: Date | null }) {
  if (!date) {
    return (
      <div className="flex h-12 w-12 shrink-0 flex-col items-center justify-center rounded-lg border border-dashed border-zinc-300 text-zinc-400">
        <span className="text-[10px] font-semibold tracking-wide">TBD</span>
      </div>
    );
  }
  const month = date.toLocaleString("en-US", { month: "short", timeZone: "UTC" }).toUpperCase();
  return (
    <div className="flex h-12 w-12 shrink-0 flex-col items-center justify-center rounded-lg border border-zinc-200 bg-zinc-50">
      <span className="text-[10px] font-semibold tracking-wide text-zinc-500">{month}</span>
      <span className="text-lg leading-none font-bold text-zinc-900 tabular-nums">
        {date.getUTCDate()}
      </span>
    </div>
  );
}

function AgendaRow({ event }: { event: AgendaEventItem }) {
  return (
    <div
      className={clsx(
        "flex items-center gap-4 rounded-2xl border border-l-4 border-zinc-200 bg-white p-4 transition hover:border-zinc-300 sm:p-5",
        ROW_ACCENT[event.status],
      )}
    >
      <DateTile date={event.scheduledDate} />
      <div className="min-w-0 flex-1">
        <h3 className="truncate font-semibold text-zinc-900">{event.school.name}</h3>
        <p className="text-xs text-zinc-400">
          {event.scheduledDate ? relativeDayLabel(event.scheduledDate) : "No date set"}
        </p>
      </div>
      <AgendaStatusBadge status={event.status} />
    </div>
  );
}

function AgendaSection({
  title,
  icon: Icon,
  events,
  emptyText,
}: {
  title: string;
  icon: typeof CalendarRange;
  events: AgendaEventItem[];
  emptyText: string;
}) {
  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-2">
        <Icon aria-hidden="true" size={15} className="text-zinc-400" />
        <h2 className="text-sm font-semibold tracking-wide text-zinc-500 uppercase">{title}</h2>
        {events.length > 0 && (
          <span className="rounded-full bg-zinc-100 px-1.5 py-0.5 text-[11px] font-medium text-zinc-500 tabular-nums">
            {events.length}
          </span>
        )}
      </div>
      {events.length === 0 ? (
        <p className="text-sm text-zinc-400">{emptyText}</p>
      ) : (
        <div className="flex flex-col gap-2">
          {events.map((e) => (
            <AgendaRow key={e.id} event={e} />
          ))}
        </div>
      )}
    </div>
  );
}

/**
 * View-only test-schedule timeline (Phase 19, FE-W1) — Unscheduled / This
 * week / Upcoming / Past, no actions, no edit. Reachable by all three roles
 * including TESTER (middleware.ts's allow-list already covers this path) —
 * no explicit page guard needed, same as Monitoring.
 */
export default async function AgendaPage() {
  const events = await getAgendaEvents();

  if (events.length === 0) {
    return (
      <div className="flex flex-col gap-6 p-4 sm:p-6">
        <PageHeader title="Agenda" description="Every test date, past and upcoming." />
        <EmptyState icon={CalendarRange} title="No schedules yet" />
      </div>
    );
  }

  const { unscheduled, upcoming, thisWeek, past } = groupAgendaEvents(events);

  return (
    <div className="flex flex-col gap-8 p-4 sm:p-6">
      <PageHeader title="Agenda" description="Every test date, past and upcoming." />

      {unscheduled.length > 0 && (
        <AgendaSection title="Unscheduled" icon={CalendarClock} events={unscheduled} emptyText="" />
      )}
      <AgendaSection title="This week" icon={CalendarDays} events={thisWeek} emptyText="No tests this week." />
      <AgendaSection title="Upcoming" icon={CalendarRange} events={upcoming} emptyText="Nothing scheduled yet." />
      <AgendaSection title="Past" icon={History} events={past} emptyText="No past tests." />
    </div>
  );
}
