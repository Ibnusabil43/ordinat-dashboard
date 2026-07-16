import { ExternalLink, AlertTriangle, CheckCircle2, CircleDashed } from "lucide-react";
import { DataTable, type DataTableColumn } from "@/components/DataTable";

export interface LinkRow {
  code: string;
  label: string;
  url: string | null;
  /** Last "Cek Link" result (server/actions/link-check.ts) — null/undefined means never checked, no warning shown. */
  checkStatus?: string | null;
  checkMessage?: string | null;
}

const BAD_CHECK_STATUSES = new Set([
  "not_found",
  "wrong_school",
  "duplicate",
  "title_mismatch",
  "error",
]);

/**
 * Compact status badge for the "Status" column — reads the persisted "Cek
 * Link" result, so it's populated on initial page load (from the DB) without
 * running any live check. A row with a URL but no check yet reads "Belum
 * dicek" rather than blank, so the column never looks empty/broken.
 */
function StatusBadge({ row }: { row: LinkRow }) {
  if (!row.url) return <span className="text-xs text-zinc-400">—</span>;

  const status = row.checkStatus ?? null;
  const config: Record<string, { label: string; cls: string; icon: typeof CheckCircle2 }> = {
    match: { label: "OK", cls: "bg-emerald-50 text-emerald-700", icon: CheckCircle2 },
    wrong_school: { label: "Wrong school", cls: "bg-red-50 text-red-700", icon: AlertTriangle },
    duplicate: { label: "Duplicate", cls: "bg-red-50 text-red-700", icon: AlertTriangle },
    title_mismatch: { label: "Title mismatch", cls: "bg-amber-50 text-amber-700", icon: AlertTriangle },
    not_found: { label: "Not found", cls: "bg-amber-50 text-amber-700", icon: AlertTriangle },
    error: { label: "Error", cls: "bg-amber-50 text-amber-700", icon: AlertTriangle },
  };
  const c = status ? config[status] : undefined;
  if (!c) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-zinc-100 px-2 py-0.5 text-xs font-medium text-zinc-500">
        <CircleDashed aria-hidden="true" size={12} />
        Not checked
      </span>
    );
  }
  const Icon = c.icon;
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${c.cls}`}
    >
      <Icon aria-hidden="true" size={12} />
      {c.label}
    </span>
  );
}

/**
 * Table of subtest links — Event Detail page's "Link Subtes" tab (FE-G4,
 * moved here in v2.0 from the now-removed public school page it originated
 * on) and Monitoring's "Link" tab. Reuses the generic DataTable (collapses
 * to card-stack on mobile). Rows without a url render muted/non-interactive,
 * not hidden — an in-progress setup shouldn't look broken. A row whose last
 * "Cek Link" result was bad shows that warning inline, right under the URL —
 * this is a passive display (reads whatever was last persisted), it never
 * triggers a live check itself; only the "Cek Link" button on the Links
 * menu does that.
 */
export function LinkTable({ rows }: { rows: LinkRow[] }) {
  const columns: DataTableColumn<LinkRow>[] = [
    {
      key: "label",
      header: "Subtest",
      render: (r) => <span className="font-medium text-zinc-900">{r.label}</span>,
    },
    {
      key: "url",
      header: "Link",
      render: (r) => (
        <div className="flex flex-col gap-1">
          {r.url ? (
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
            <span className="text-xs text-zinc-400">Not available yet</span>
          )}
          {r.checkStatus && BAD_CHECK_STATUSES.has(r.checkStatus) && r.checkMessage && (
            <span className="inline-flex items-start gap-1 text-xs text-amber-700">
              <AlertTriangle aria-hidden="true" size={12} className="mt-0.5 shrink-0" />
              {r.checkMessage}
            </span>
          )}
        </div>
      ),
    },
    {
      key: "status",
      header: "Status",
      render: (r) => <StatusBadge row={r} />,
    },
  ];

  return <DataTable columns={columns} data={rows} getRowKey={(r) => r.code} />;
}
