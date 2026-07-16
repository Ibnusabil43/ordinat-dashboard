import { redirect } from "next/navigation";
import Link from "next/link";
import { ChevronRight, Link2 } from "lucide-react";
import { getEvents, type EventListItem } from "@/lib/queries/events";
import { PageHeader } from "@/components/admin/PageHeader";
import { DataTable, type DataTableColumn } from "@/components/DataTable";
import { EmptyState } from "@/components/EmptyState";
import { resolveActiveSubtests } from "@/lib/constants";
import { formatDate } from "@/lib/format";
import { getCurrentRole } from "@/lib/auth-guard";

/**
 * Event list entry point for Links (Phase 19, FE-T1) — one row per event
 * (not per school) since links belong to an event, not a school; a school
 * with several events gets a row each, so nothing is hidden behind a
 * "latest event only" assumption. Reuses `getEvents()`/`EventListItem`, same
 * as Schedules' own list. ADMIN-only (Phase 19, BE-P1) — matches the old
 * Link Management page's restriction.
 */
export default async function LinksPage() {
  if ((await getCurrentRole()) !== "ADMIN") redirect("/");

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
      key: "links",
      header: "Links Filled",
      render: (e) => `${e._count.links}/${resolveActiveSubtests(e.school.activeSubtests).length}`,
    },
    {
      key: "actions",
      header: "Actions",
      className: "text-right",
      render: (e) => (
        <Link
          href={`/links/${e.id}`}
          aria-label={`Manage links for ${e.school.name}`}
          className="inline-flex items-center gap-1 text-sm font-medium text-zinc-900 transition hover:text-zinc-500"
        >
          Manage
          <ChevronRight aria-hidden="true" size={16} />
        </Link>
      ),
    },
  ];

  return (
    <div className="flex flex-col gap-6 p-4 sm:p-6">
      <PageHeader title="Links" description="Manage, check, and fix subtest links." />

      <DataTable
        columns={columns}
        data={events}
        getRowKey={(e) => e.id}
        emptyState={<EmptyState icon={Link2} title="No schools yet" description="Add a school first — its schedule is created automatically." />}
      />
    </div>
  );
}
