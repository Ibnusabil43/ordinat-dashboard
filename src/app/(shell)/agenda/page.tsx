import { CalendarRange } from "lucide-react";
import { getAgendaEvents, type AgendaEventItem } from "@/lib/queries/events";
import { groupAgendaEvents } from "@/lib/agenda";
import { PageHeader } from "@/components/admin/PageHeader";
import { EmptyState } from "@/components/EmptyState";
import { AgendaStatusBadge } from "@/components/admin/agenda/AgendaStatusBadge";
import { formatDateID } from "@/lib/format";

function AgendaRow({ event }: { event: AgendaEventItem }) {
  return (
    <div className="flex flex-col gap-2 rounded-2xl border border-zinc-200 bg-white p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
      <div className="min-w-0">
        <p className="text-sm text-zinc-500">{formatDateID(event.scheduledDate)}</p>
        <h3 className="truncate font-semibold text-zinc-900">{event.school.name}</h3>
      </div>
      <AgendaStatusBadge status={event.status} />
    </div>
  );
}

function AgendaSection({
  title,
  events,
  emptyText,
}: {
  title: string;
  events: AgendaEventItem[];
  emptyText: string;
}) {
  return (
    <div className="flex flex-col gap-3">
      <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-500">{title}</h2>
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
 * View-only test-schedule timeline (Phase 19, FE-W1) — Upcoming / This week
 * / Past, no actions, no edit. Reachable by all three roles including
 * TESTER (middleware.ts's allow-list already covers this path) — no
 * explicit page guard needed, same as Monitoring.
 */
export default async function AgendaPage() {
  const events = await getAgendaEvents();

  if (events.length === 0) {
    return (
      <div className="flex flex-col gap-6 p-4 sm:p-6">
        <PageHeader title="Agenda" description="Every test date, past and upcoming." />
        <EmptyState icon={CalendarRange} title="Belum ada jadwal" />
      </div>
    );
  }

  const { upcoming, thisWeek, past } = groupAgendaEvents(events);

  return (
    <div className="flex flex-col gap-8 p-4 sm:p-6">
      <PageHeader title="Agenda" description="Every test date, past and upcoming." />

      <AgendaSection title="This week" events={thisWeek} emptyText="No tests this week." />
      <AgendaSection title="Upcoming" events={upcoming} emptyText="Nothing scheduled yet." />
      <AgendaSection title="Past" events={past} emptyText="No past tests." />
    </div>
  );
}
