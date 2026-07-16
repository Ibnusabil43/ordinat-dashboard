import { DataTable, type DataTableColumn } from "@/components/DataTable";

export interface TesterRow {
  id: string;
  kelas: string;
  tester: string | null;
}

/**
 * Kelas/Tester table for the Event Detail page's "Tester" tab (FE-G4).
 * A kelas without an assigned tester renders muted, not hidden — same
 * convention as LinkTable's unfilled URLs.
 */
export function TesterTable({ rows }: { rows: TesterRow[] }) {
  const columns: DataTableColumn<TesterRow>[] = [
    {
      key: "kelas",
      header: "Class",
      render: (r) => <span className="font-medium text-zinc-900">{r.kelas}</span>,
    },
    {
      key: "tester",
      header: "Tester",
      render: (r) =>
        r.tester ? (
          <span className="text-zinc-700">{r.tester}</span>
        ) : (
          <span className="text-xs text-zinc-400">Not assigned</span>
        ),
    },
  ];

  return <DataTable columns={columns} data={rows} getRowKey={(r) => r.id} />;
}
