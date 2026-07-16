"use client";

import { Bar, BarChart, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { STATUS_LABEL, type EventStatus } from "@/lib/status";
import type { EventsByStatus, EventsByMonth } from "@/lib/queries/overview";

/**
 * Overview charts (Phase 19, FE-X1). Client component — Recharts needs the
 * DOM; the Overview page stays a Server Component and passes data down.
 *
 * Revised to full monochrome — no color exception here after all (reverses
 * the earlier FE-X2 decision; DESIGN.md §2 updated to match). Status hues
 * stay scoped to Cek Nama and Agenda only. Fills are a zinc intensity ramp,
 * same convention as STATUS_STYLE (lighter = earlier stage, darker = further
 * along) — just hex, since Recharts takes color strings, not Tailwind classes.
 */
const STATUS_FILL: Record<EventStatus, string> = {
  SCHEDULED: "#d4d4d8", // zinc-300
  ONGOING: "#a1a1aa", // zinc-400
  REKAP: "#71717a", // zinc-500
  DONE: "#18181b", // zinc-900
};

const MONTH_FILL = "#52525b"; // zinc-600
const AXIS_COLOR = "#d4d4d8"; // zinc-300

const MONTH_LABELS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

const tooltipStyle = {
  borderRadius: 8,
  border: "1px solid #e4e4e7",
  fontSize: 12,
  padding: "6px 10px",
} as const;

const tickStyle = { fontSize: 10, fill: "#a1a1aa" };

/**
 * Both charts merged into one compact, secondary section (not two large
 * standalone cards) — side by side on desktop, stacked on mobile. Treated as
 * supplementary detail below the primary stats/tables, so it's shorter and
 * more muted than the rest of the page.
 */
export function OverviewCharts({
  byStatus,
  byMonth,
  year,
}: {
  byStatus: EventsByStatus[];
  byMonth: EventsByMonth[];
  year: number;
}) {
  const statusRows = byStatus.map((d) => ({ ...d, label: STATUS_LABEL[d.status] }));
  const monthRows = byMonth.map((d) => ({ ...d, label: MONTH_LABELS[d.month - 1] }));

  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-4">
      <h3 className="text-xs font-medium tracking-wide text-zinc-500 uppercase">Trends</h3>
      <div className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <p className="text-xs text-zinc-400">Tests by status</p>
          <div className="mt-1 h-32 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={statusRows} margin={{ top: 4, right: 4, bottom: 0, left: -28 }}>
                <XAxis
                  dataKey="label"
                  tick={tickStyle}
                  axisLine={{ stroke: AXIS_COLOR }}
                  tickLine={false}
                  interval={0}
                />
                <YAxis allowDecimals={false} tick={tickStyle} axisLine={false} tickLine={false} />
                <Tooltip cursor={{ fill: "#f4f4f5" }} contentStyle={tooltipStyle} />
                <Bar dataKey="count" radius={[3, 3, 0, 0]}>
                  {statusRows.map((r) => (
                    <Cell key={r.status} fill={STATUS_FILL[r.status]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div>
          <p className="text-xs text-zinc-400">Tests by month — {year}</p>
          <div className="mt-1 h-32 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={monthRows} margin={{ top: 4, right: 4, bottom: 0, left: -28 }}>
                <XAxis
                  dataKey="label"
                  tick={tickStyle}
                  axisLine={{ stroke: AXIS_COLOR }}
                  tickLine={false}
                  interval={1}
                />
                <YAxis allowDecimals={false} tick={tickStyle} axisLine={false} tickLine={false} />
                <Tooltip cursor={{ fill: "#f4f4f5" }} contentStyle={tooltipStyle} />
                <Bar dataKey="count" fill={MONTH_FILL} radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}
