import type { LucideIcon } from "lucide-react";

/** One of the 4 Overview summary cards. Spec: DESIGN.md §11. */
export function SummaryCard({
  icon: Icon,
  value,
  label,
}: {
  icon: LucideIcon;
  value: number;
  label: string;
}) {
  return (
    <div className="rounded-2xl border border-zinc-200 bg-white p-4 sm:p-6">
      <Icon aria-hidden="true" size={18} className="text-zinc-400" />
      <div className="mt-3 text-2xl font-bold text-zinc-900">{value.toLocaleString("id-ID")}</div>
      <div className="mt-1 text-xs tracking-wide text-zinc-500 uppercase">{label}</div>
    </div>
  );
}
