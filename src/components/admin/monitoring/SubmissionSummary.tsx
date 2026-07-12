import { clsx } from "clsx";
import type { SubtestSubmissionCount } from "@/lib/queries/monitoring";

/**
 * Zinc-intensity ramp — same convention as ResultsSummary.tsx's per-Gugus
 * progress (darker = more complete), not a second visual language.
 */
function fillClass(pct: number): string {
  if (pct >= 100) return "bg-zinc-900";
  if (pct >= 90) return "bg-zinc-600";
  if (pct > 0) return "bg-zinc-400";
  return "bg-zinc-200";
}

/**
 * Per-subtest progress bars (FE-P2, DESIGN.md §5 "Monitoring infographic").
 * There's no known "expected" headcount to measure against, so each bar is
 * filled relative to whichever subtest has the most submissions — normally
 * every student takes all 12, so a subtest trailing behind the others is
 * exactly the signal this is meant to surface at a glance.
 */
export function SubmissionSummary({ counts }: { counts: SubtestSubmissionCount[] }) {
  const max = Math.max(1, ...counts.map((c) => c.count));

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
      {counts.map((c) => {
        const pct = Math.round((c.count / max) * 100);
        return (
          <div key={c.code} className="rounded-2xl border border-zinc-200 bg-white p-4">
            <div className="flex items-baseline justify-between gap-2">
              <span className="truncate text-sm font-medium text-zinc-900">{c.label}</span>
              <span className="shrink-0 font-mono text-sm text-zinc-500">{c.count}</span>
            </div>
            <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-zinc-100">
              <div className={clsx("h-full rounded-full", fillClass(pct))} style={{ width: `${pct}%` }} />
            </div>
          </div>
        );
      })}
    </div>
  );
}
