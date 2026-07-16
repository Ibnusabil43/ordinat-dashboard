import { Suspense } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  CheckCheck,
  School,
  CircleDot,
  RefreshCw,
  GraduationCap,
  Users,
  UserCheck,
  type LucideIcon,
} from "lucide-react";
import {
  getOverviewStats,
  getEventsNeedingAttention,
  getEventsByStatus,
  getEventsByMonth,
  getSchoolKelasTotals,
  getStudentsSubmittedThisYear,
} from "@/lib/queries/overview";
import { getOngoingTestsWithKelas } from "@/lib/queries/events";
import { getRecentlyAddedSchools } from "@/lib/queries/schools";
import { PageHeader } from "@/components/admin/PageHeader";
import { OverviewCharts } from "@/components/admin/OverviewCharts";
import { OngoingTestsList } from "@/components/admin/OngoingTestsList";
import { RecentSchoolsTable } from "@/components/admin/RecentSchoolsTable";
import { Skeleton } from "@/components/Skeleton";
import { EmptyState } from "@/components/EmptyState";
import { formatDate } from "@/lib/format";
import { REKAP_ATTENTION_THRESHOLD_DAYS } from "@/lib/constants";

function daysSince(date: Date): number {
  const ms = Date.now() - date.getTime();
  return Math.floor(ms / (1000 * 60 * 60 * 24));
}

/**
 * One cell in the stat grid (redesign, user request — the original flat
 * text-only strip read too plain). Still fully monochrome/restrained per
 * DESIGN.md §2 — no color, no gradients — the polish comes from an icon
 * anchor, a bigger/bolder tabular number, and grid dividers instead of bare
 * gaps, not from hue. Icon sits in its own soft zinc-50 tile so it reads as
 * a deliberate accent, not a stray glyph floating next to text.
 */
function StatCell({
  icon: Icon,
  label,
  value,
}: {
  icon: LucideIcon;
  label: string;
  value: string | number;
}) {
  return (
    <div className="flex items-start gap-3 px-4 py-4 sm:px-5">
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-zinc-50 text-zinc-400">
        <Icon aria-hidden="true" size={17} />
      </span>
      <div className="flex min-w-0 flex-col">
        <span className="text-2xl font-bold tracking-tight text-zinc-900 tabular-nums">
          {typeof value === "number" ? value.toLocaleString("en-US") : value}
        </span>
        <span className="text-xs text-zinc-500">{label}</span>
      </div>
    </div>
  );
}

function StatCellSkeleton() {
  return (
    <div className="flex items-start gap-3 px-4 py-4 sm:px-5">
      <Skeleton className="h-9 w-9 shrink-0 rounded-lg" />
      <div className="flex flex-col gap-1.5 pt-0.5">
        <Skeleton className="h-7 w-12" />
        <Skeleton className="h-3 w-24" />
      </div>
    </div>
  );
}

/** Streamed separately so a slow or failed live-Sheets read never blocks the rest of the strip. Null degrades to a dash, never blanks the page. */
async function StudentsSubmittedCell() {
  const submitted = await getStudentsSubmittedThisYear();
  return (
    <StatCell
      icon={UserCheck}
      label={submitted === null ? "Students submitted (unavailable)" : "Students submitted this year"}
      value={submitted === null ? "—" : submitted}
    />
  );
}

export default async function OverviewPage() {
  const currentYear = new Date().getUTCFullYear();
  const [stats, attention, eventsByStatus, eventsByMonth, totals, ongoingTests, recentSchools] =
    await Promise.all([
      getOverviewStats(),
      getEventsNeedingAttention(),
      getEventsByStatus(),
      getEventsByMonth(),
      getSchoolKelasTotals(),
      getOngoingTestsWithKelas(),
      getRecentlyAddedSchools(),
    ]);

  return (
    <div className="flex flex-col gap-6 p-4 sm:p-6">
      <PageHeader title="Overview" description="Current status of psychotest activity." />

      {/*
        Stat grid — redesigned (user request): dividers instead of bare
        gaps, an icon anchor + larger tabular number per cell for real
        hierarchy. Column count steps up with viewport (2 → 4 → 7) so it
        never feels cramped; divide-x + divide-y together handle the
        wrapping grid lines correctly at every breakpoint (no orphaned
        borders on wrap, unlike a flex+divide-x row would produce).
      */}
      <div className="grid grid-cols-2 divide-x divide-y divide-zinc-200 overflow-hidden rounded-xl border border-zinc-200 bg-white sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7 xl:divide-y-0">
        <StatCell icon={School} label="Schools" value={stats.totalSchools} />
        <StatCell icon={CircleDot} label="Ongoing" value={stats.ongoingCount} />
        <StatCell icon={RefreshCw} label="In recap" value={stats.rekapCount} />
        <StatCell icon={CheckCheck} label="Done this month" value={stats.doneThisMonthCount} />
        <StatCell icon={GraduationCap} label="Classes" value={totals.totalKelas} />
        <StatCell
          icon={Users}
          label="Classes with tester"
          value={`${totals.kelasWithTester}/${totals.totalKelas}`}
        />
        <Suspense fallback={<StatCellSkeleton />}>
          <StudentsSubmittedCell />
        </Suspense>
      </div>

      {/* Testing Today — schools currently running a test, expandable to their class/tester list. */}
      <div>
        <h2 className="text-sm font-semibold text-zinc-900">Testing today</h2>
        <p className="mt-1 text-sm text-zinc-500">Schools with an active test session right now.</p>
        <div className="mt-3">
          {ongoingTests.length === 0 ? (
            <EmptyState icon={CheckCheck} title="No school is testing right now" />
          ) : (
            <OngoingTestsList items={ongoingTests} />
          )}
        </div>
      </div>

      {/* Recently Added Schools — quick setup-status glance, no live API calls. */}
      <div>
        <h2 className="text-sm font-semibold text-zinc-900">Recently added schools</h2>
        <p className="mt-1 text-sm text-zinc-500">The 5 most recently added schools and their setup status.</p>
        <div className="mt-3">
          <RecentSchoolsTable schools={recentSchools} />
        </div>
      </div>

      {/* Attention Needed — recap sessions waiting past the threshold. */}
      <div>
        <h2 className="text-sm font-semibold text-zinc-900">Needs attention</h2>
        <p className="mt-1 text-sm text-zinc-500">
          Recap sessions open for more than {REKAP_ATTENTION_THRESHOLD_DAYS} days.
        </p>

        <div className="mt-3">
          {attention.length === 0 ? (
            <EmptyState icon={CheckCheck} title="Nothing needs attention" description="Every recap is within a normal timeframe." />
          ) : (
            <div className="flex flex-col gap-3">
              {attention.map((e) => {
                const startedAt = e.recapJobs[0]?.startedAt;
                return (
                  <Link
                    key={e.id}
                    href={`/jadwal/${e.id}`}
                    className="flex flex-col gap-3 rounded-2xl border border-zinc-200 bg-white p-4 transition hover:border-zinc-300 sm:flex-row sm:items-center sm:justify-between sm:p-6"
                  >
                    <div>
                      <h3 className="font-semibold text-zinc-900">{e.school.name}</h3>
                      {startedAt && (
                        <p className="mt-1 text-sm text-zinc-500">
                          Recap started {formatDate(startedAt)} · {daysSince(startedAt)} days ago
                        </p>
                      )}
                    </div>
                    <span className="inline-flex w-fit items-center gap-1.5 rounded-full bg-zinc-900 px-2.5 py-1 text-xs font-medium text-white">
                      <AlertTriangle aria-hidden="true" size={12} />
                      Follow up needed
                    </span>
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Trends — secondary/de-emphasized, merged into one compact section, monochrome. */}
      <OverviewCharts byStatus={eventsByStatus} byMonth={eventsByMonth} year={currentYear} />
    </div>
  );
}
