import type { LucideIcon } from "lucide-react";
import { clsx } from "clsx";

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}

/** Shown in place of a list/table/grid when there's no data. Spec: DESIGN.md §5. */
export function EmptyState({ icon: Icon, title, description, action, className }: EmptyStateProps) {
  return (
    <div className={clsx("flex flex-col items-center py-12 text-center", className)}>
      <Icon aria-hidden="true" size={32} className="text-zinc-300" />
      <p className="mt-3 text-sm font-medium text-zinc-900">{title}</p>
      {description && <p className="mt-1 max-w-xs text-sm text-zinc-500">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
