import Link from "next/link";
import { ChevronRight, School } from "lucide-react";
import { getSchoolsForMonitoring, type SchoolForMonitoring } from "@/lib/queries/monitoring";
import { PageHeader } from "@/components/admin/PageHeader";
import { DataTable, type DataTableColumn } from "@/components/DataTable";
import { EmptyState } from "@/components/EmptyState";

/**
 * School list (FE-P1) — same DataTable treatment as Schools/Schedules
 * (desktop table, mobile card-stack), not a card grid (revised after review
 * — a plain list reads faster than cards for a pure navigation list). All 3
 * roles reach this, including TESTER, per PRD FR-11. Each row links to the
 * per-school dashboard at /monitoring/[schoolId].
 */
export default async function MonitoringPage() {
  const schools = await getSchoolsForMonitoring();

  const columns: DataTableColumn<SchoolForMonitoring>[] = [
    {
      key: "name",
      header: "School",
      mobile: "primary",
      render: (s) => <span className="font-medium text-zinc-900">{s.name}</span>,
    },
    {
      key: "status",
      header: "Status",
      render: (s) =>
        s.driveRawSheetId ? null : <span className="text-xs text-zinc-400">RAW sheet not set up</span>,
    },
    {
      key: "actions",
      header: "Actions",
      className: "text-right",
      mobile: "action",
      render: (s) => (
        <Link
          href={`/monitoring/${s.id}`}
          aria-label={`View monitoring for ${s.name}`}
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
      <PageHeader title="Monitoring" description="Select a school to view its psychotest submission summary." />

      <DataTable
        columns={columns}
        data={schools}
        getRowKey={(s) => s.id}
        emptyState={<EmptyState icon={School} title="No schools yet" />}
      />
    </div>
  );
}
