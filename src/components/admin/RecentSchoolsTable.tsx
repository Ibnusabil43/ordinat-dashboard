import { clsx } from "clsx";
import { School } from "lucide-react";
import { DataTable, type DataTableColumn } from "@/components/DataTable";
import { EmptyState } from "@/components/EmptyState";
import type { RecentSchool, SchoolLinkStatus } from "@/lib/queries/schools";

const LINK_STATUS_LABEL: Record<SchoolLinkStatus, string> = {
  ok: "Complete",
  incomplete: "Incomplete",
  none: "No test yet",
};

/** Monochrome only — filled = confirmed/connected, muted = not yet, same intensity-carries-meaning convention as STATUS_STYLE. */
function StatusPill({ label, filled }: { label: string; filled: boolean }) {
  return (
    <span
      className={clsx(
        "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium",
        filled ? "bg-zinc-900 text-white" : "bg-zinc-100 text-zinc-500",
      )}
    >
      {label}
    </span>
  );
}

/** The 5 most recently added schools, with a quick glance at setup status — no live Sheets/Drive calls, reads only what's already stored (queries/schools.ts). */
export function RecentSchoolsTable({ schools }: { schools: RecentSchool[] }) {
  const columns: DataTableColumn<RecentSchool>[] = [
    {
      key: "name",
      header: "School",
      render: (s) => <span className="font-medium text-zinc-900">{s.name}</span>,
    },
    {
      key: "link",
      header: "Links",
      render: (s) => (
        <StatusPill label={LINK_STATUS_LABEL[s.linkStatus]} filled={s.linkStatus === "ok"} />
      ),
    },
    {
      key: "rawSheet",
      header: "Raw Sheet",
      render: (s) => (
        <StatusPill label={s.hasRawSheet ? "Connected" : "Not connected"} filled={s.hasRawSheet} />
      ),
    },
    {
      key: "formFolder",
      header: "Form Folder",
      render: (s) => (
        <StatusPill label={s.hasFormFolder ? "Connected" : "Not connected"} filled={s.hasFormFolder} />
      ),
    },
  ];

  return (
    <DataTable
      columns={columns}
      data={schools}
      getRowKey={(s) => s.id}
      emptyState={<EmptyState icon={School} title="No schools yet" />}
    />
  );
}
