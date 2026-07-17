import { clsx } from "clsx";

export interface DataTableColumn<T> {
  key: string;
  header: string;
  render: (row: T) => React.ReactNode;
  /** Applied to both the <th>/<td> in the desktop table (e.g. width, alignment). */
  className?: string;
  /**
   * Role in the MOBILE card layout (desktop is unaffected):
   *  - "primary" — the card's title: rendered prominently at the top, no label.
   *  - "action"  — pinned to the card's top-right (edit/delete/detail), no label.
   *  - undefined — a labeled meta row (header left, value right) in the card body.
   * Tables that set no roles fall back to an all-meta card (the old behavior),
   * so this is backward-compatible for e.g. the inline-editable Kelas table.
   */
  mobile?: "primary" | "action";
}

interface DataTableProps<T> {
  columns: DataTableColumn<T>[];
  data: T[];
  getRowKey: (row: T) => string;
  /** Rendered instead of the table/card-stack when `data` is empty — pass an <EmptyState />. */
  emptyState?: React.ReactNode;
}

/**
 * Generic table that collapses to a card-stack below the `sm` breakpoint instead of
 * horizontal-scrolling — see DESIGN.md §5–6. Same `columns`/`data` render both layouts.
 */
export function DataTable<T>({ columns, data, getRowKey, emptyState }: DataTableProps<T>) {
  if (data.length === 0 && emptyState) {
    return <>{emptyState}</>;
  }

  return (
    <>
      {/* Desktop */}
      <div className="hidden overflow-hidden rounded-2xl border border-zinc-200 sm:block">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-zinc-200 bg-zinc-50">
              {columns.map((col) => (
                <th
                  key={col.key}
                  className={clsx("px-4 py-3 text-left text-xs font-medium text-zinc-500", col.className)}
                >
                  {col.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-200 bg-white">
            {data.map((row) => (
              <tr key={getRowKey(row)} className="hover:bg-zinc-50">
                {columns.map((col) => (
                  <td key={col.key} className={clsx("px-4 py-3 text-zinc-700", col.className)}>
                    {col.render(row)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile: card-stack — a real card hierarchy, not a flat label:value dump.
          Primary column = title, action column = top-right, rest = meta rows. */}
      <div className="flex flex-col gap-3 sm:hidden">
        {data.map((row) => {
          const primary = columns.filter((c) => c.mobile === "primary");
          const actions = columns.filter((c) => c.mobile === "action");
          const meta = columns.filter((c) => !c.mobile);
          const hasHeader = primary.length > 0 || actions.length > 0;

          return (
            <div key={getRowKey(row)} className="rounded-2xl border border-zinc-200 bg-white p-4">
              {hasHeader && (
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1 text-base font-semibold text-zinc-900">
                    {primary.map((col) => (
                      <div key={col.key} className="truncate">
                        {col.render(row)}
                      </div>
                    ))}
                  </div>
                  {actions.length > 0 && (
                    <div className="flex shrink-0 items-center gap-1">
                      {actions.map((col) => (
                        <div key={col.key}>{col.render(row)}</div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {meta.length > 0 && (
                <dl
                  className={clsx(
                    "flex flex-col gap-2",
                    hasHeader && "mt-3 border-t border-zinc-100 pt-3",
                  )}
                >
                  {meta.map((col) => (
                    <div key={col.key} className="flex items-center justify-between gap-3">
                      <dt className="shrink-0 text-xs font-medium text-zinc-500">{col.header}</dt>
                      <dd className="min-w-0 text-right text-sm text-zinc-900">{col.render(row)}</dd>
                    </div>
                  ))}
                </dl>
              )}
            </div>
          );
        })}
      </div>
    </>
  );
}
