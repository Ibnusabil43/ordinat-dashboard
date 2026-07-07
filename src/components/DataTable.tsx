import { clsx } from "clsx";

export interface DataTableColumn<T> {
  key: string;
  header: string;
  render: (row: T) => React.ReactNode;
  /** Applied to both the <th>/<td> in the desktop table (e.g. width, alignment). */
  className?: string;
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

      {/* Mobile: card-stack */}
      <div className="flex flex-col gap-3 sm:hidden">
        {data.map((row) => (
          <div key={getRowKey(row)} className="rounded-2xl border border-zinc-200 bg-white p-4">
            {columns.map((col) => (
              <div key={col.key} className="flex items-center justify-between gap-3 py-1 first:pt-0 last:pb-0">
                <span className="text-xs font-medium text-zinc-500">{col.header}</span>
                <span className="text-sm text-zinc-900">{col.render(row)}</span>
              </div>
            ))}
          </div>
        ))}
      </div>
    </>
  );
}
