/**
 * Admin page header: title (+ optional description) on the left, action slot
 * on the right. `description` accepts a ReactNode (not just a string) —
 * e.g. the Schedules detail page passes an interactive inline date editor
 * there instead of plain text.
 */
export function PageHeader({
  title,
  description,
  action,
}: {
  title: string;
  description?: React.ReactNode;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-zinc-900">{title}</h1>
        {/*
          A plain <div>, not <p> — description now accepts arbitrary
          ReactNode (e.g. ScheduleDateEditor's editing state renders a
          <div>), and a block element inside a <p> is invalid HTML that
          triggers a hydration error. Same visual result either way, this
          is purely a content-model fix.
        */}
        {description && <div className="mt-1 text-sm text-zinc-500">{description}</div>}
      </div>
      {action}
    </div>
  );
}
