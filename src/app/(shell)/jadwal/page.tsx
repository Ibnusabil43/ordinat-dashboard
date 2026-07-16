import Link from "next/link";
import { ChevronRight, CalendarDays } from "lucide-react";
import { getEvents, type EventListItem } from "@/lib/queries/events";
import { PageHeader } from "@/components/admin/PageHeader";
import { DataTable, type DataTableColumn } from "@/components/DataTable";
import { EmptyState } from "@/components/EmptyState";
import { StatusBadge } from "@/components/StatusBadge";
import { formatDate } from "@/lib/format";

/**
 * "Add Schedule" removed here (user request, post-19-7) — every school now
 * gets its schedule created automatically alongside the school itself
 * (schools.ts's createSchool), so there's no standalone create-a-schedule
 * flow anymore. This list is purely a status overview; a schedule with no
 * date yet ("Date not set yet") is set from its own detail page.
 */
export default async function EventListPage() {
  const events = await getEvents();

  const columns: DataTableColumn<EventListItem>[] = [
    {
      key: "school",
      header: "School",
      render: (e) => <span className="font-medium text-zinc-900">{e.school.name}</span>,
    },
    {
      key: "date",
      header: "Date",
      render: (e) =>
        e.scheduledDate ? (
          formatDate(e.scheduledDate)
        ) : (
          <span className="text-zinc-400">Date not set yet</span>
        ),
    },
    {
      key: "status",
      header: "Status",
      render: (e) => <StatusBadge status={e.status} />,
    },
    {
      key: "actions",
      header: "Actions",
      className: "text-right",
      render: (e) => (
        <Link
          href={`/jadwal/${e.id}`}
          aria-label={`View schedule for ${e.school.name}`}
          className="inline-flex items-center gap-1 text-sm font-medium text-zinc-900 transition hover:text-zinc-500"
        >
          Detail
          <ChevronRight aria-hidden="true" size={16} />
        </Link>
      ),
    },
  ];

  return (
    <div className="flex flex-col gap-6 p-4 sm:p-6">
      <PageHeader
        title="Schedules"
        description="Track each school's test schedule and status."
      />

      <DataTable
        columns={columns}
        data={events}
        getRowKey={(e) => e.id}
        emptyState={
          <EmptyState
            icon={CalendarDays}
            title="No schedules yet"
            description="Schedules are created automatically when you add a school."
          />
        }
      />
    </div>
  );
}
