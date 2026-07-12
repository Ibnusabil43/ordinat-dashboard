import { ExternalLink } from "lucide-react";
import { DataTable, type DataTableColumn } from "@/components/DataTable";

export interface LinkRow {
  code: string;
  label: string;
  url: string | null;
}

/**
 * Table of subtest links — Event Detail page's "Link Subtes" tab (FE-G4,
 * moved here in v2.0 from the now-removed public school page it originated
 * on). Reuses the generic DataTable (collapses to card-stack on mobile).
 * Rows without a url render muted/non-interactive, not hidden — an
 * in-progress setup shouldn't look broken.
 */
export function LinkTable({ rows }: { rows: LinkRow[] }) {
  const columns: DataTableColumn<LinkRow>[] = [
    {
      key: "label",
      header: "Subtes",
      render: (r) => <span className="font-medium text-zinc-900">{r.label}</span>,
    },
    {
      key: "url",
      header: "Link",
      render: (r) =>
        r.url ? (
          <a
            href={r.url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 font-mono text-xs text-zinc-900 underline decoration-zinc-300 underline-offset-2 transition hover:text-zinc-600"
          >
            {r.url}
            <ExternalLink aria-hidden="true" size={12} />
          </a>
        ) : (
          <span className="text-xs text-zinc-400">Belum tersedia</span>
        ),
    },
  ];

  return <DataTable columns={columns} data={rows} getRowKey={(r) => r.code} />;
}
