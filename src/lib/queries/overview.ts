import { prisma } from "@/lib/prisma";
import { REKAP_ATTENTION_THRESHOLD_DAYS, resolveActiveSubtests } from "@/lib/constants";
import { EVENT_STATUSES, type EventStatus } from "@/lib/status";
import { listSheetTabs, batchReadTabs } from "@/lib/google-sheets";
import { normalizeName } from "@/lib/name-match";

/** Aggregate counts for the Overview page's summary cards (FE-E1). */
export interface OverviewStats {
  totalSchools: number;
  ongoingCount: number;
  rekapCount: number;
  doneThisMonthCount: number;
}

export async function getOverviewStats(): Promise<OverviewStats> {
  const now = new Date();
  // UTC month boundaries — consistent with how scheduledDate is stored/formatted
  // elsewhere (see src/lib/format.ts), so this doesn't drift with server TZ.
  const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  const nextMonthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1));

  const [totalSchools, ongoingCount, rekapCount, doneThisMonthCount] = await Promise.all([
    prisma.school.count(),
    prisma.psikotesEvent.count({ where: { status: "ONGOING" } }),
    prisma.psikotesEvent.count({ where: { status: "REKAP" } }),
    prisma.psikotesEvent.count({
      where: { status: "DONE", updatedAt: { gte: monthStart, lt: nextMonthStart } },
    }),
  ]);

  return { totalSchools, ongoingCount, rekapCount, doneThisMonthCount };
}

// ── Phase 19 (BE-Q1/BE-Q2) — Overview visualization aggregates ──────────────

export interface EventsByStatus {
  status: EventStatus;
  count: number;
}

/**
 * Event count per status, all 4 statuses always present (0-filled) and in
 * canonical order — the bar chart shouldn't drop a status just because it has
 * no events, and never hardcodes status strings (imports EVENT_STATUSES).
 */
export async function getEventsByStatus(): Promise<EventsByStatus[]> {
  const grouped = await prisma.psikotesEvent.groupBy({
    by: ["status"],
    _count: { _all: true },
  });
  const countByStatus = new Map(grouped.map((g) => [g.status, g._count._all]));
  return EVENT_STATUSES.map((status) => ({ status, count: countByStatus.get(status) ?? 0 }));
}

export interface EventsByMonth {
  /** 1–12. */
  month: number;
  count: number;
}

/**
 * Events grouped by month of scheduledDate for the current year, all 12
 * months present (0-filled). UTC month boundaries, consistent with
 * getOverviewStats and scheduledDate's UTC-midnight storage. Bucketed in JS
 * (Prisma can't group by a derived month without raw SQL) — the yearly event
 * count is small enough that fetching dates and counting is fine.
 */
export async function getEventsByMonth(): Promise<EventsByMonth[]> {
  const year = new Date().getUTCFullYear();
  const yearStart = new Date(Date.UTC(year, 0, 1));
  const nextYearStart = new Date(Date.UTC(year + 1, 0, 1));

  const events = await prisma.psikotesEvent.findMany({
    where: { scheduledDate: { gte: yearStart, lt: nextYearStart } },
    select: { scheduledDate: true },
  });

  const counts = new Array(12).fill(0) as number[];
  for (const e of events) {
    // The gte/lt where clause already excludes null dates at the DB level
    // (SQL NULL never satisfies a range comparison) — this guard just keeps
    // the type honest, it isn't excluding real rows.
    if (e.scheduledDate) counts[e.scheduledDate.getUTCMonth()]++;
  }
  return counts.map((count, i) => ({ month: i + 1, count }));
}

export interface SchoolKelasTotals {
  totalSchools: number;
  totalKelas: number;
  /** Kelas with a tester assigned — `tester` is null when unassigned (kelasTesterSchema transforms "" → null on save). */
  kelasWithTester: number;
}

export async function getSchoolKelasTotals(): Promise<SchoolKelasTotals> {
  const [totalSchools, totalKelas, kelasWithTester] = await Promise.all([
    prisma.school.count(),
    prisma.kelas.count(),
    prisma.kelas.count({ where: { tester: { not: null } } }),
  ]);
  return { totalSchools, totalKelas, kelasWithTester };
}

/**
 * "Students submitted" estimate for the current year (BE-Q2). Definition: for
 * each kelas (grouped by the raw sheet's own KELAS-column value, not the DB
 * Kelas rows — the two don't reliably match, e.g. "X-1" vs "KELAS X 1"), take
 * the average submission count across the subtests that kelas actually appears
 * in, then sum across kelas and across every school that ran a test this year.
 * Averaging across subtests smooths partial completion, so the sum approximates
 * "how many students have submitted" rather than double-counting per subtest.
 *
 * Live Sheets read — resilient by contract: any failure (unshared sheet,
 * revoked access, API down) returns null, which the Overview renders as a
 * "data unavailable" tile rather than blanking the whole page (FE-P4 pattern).
 * Only ONE metric reads sheets here, so there's no cross-chart re-fetch to
 * memoize — the BE-Q1 aggregates above are pure Prisma.
 */
export async function getStudentsSubmittedThisYear(): Promise<number | null> {
  try {
    const year = new Date().getUTCFullYear();
    const yearStart = new Date(Date.UTC(year, 0, 1));
    const nextYearStart = new Date(Date.UTC(year + 1, 0, 1));

    const schools = await prisma.school.findMany({
      where: {
        driveRawSheetId: { not: null },
        events: { some: { scheduledDate: { gte: yearStart, lt: nextYearStart } } },
      },
      select: { driveRawSheetId: true, activeSubtests: true },
    });

    // Per-school reads are independent — run them concurrently so total wall
    // time is the slowest single school, not the sum (measured ~18s → ~6s on
    // real data). Each school still does listSheetTabs → batchReadTabs
    // sequentially internally (needs tab names before reading).
    const perSchool = await Promise.all(
      schools.map((school) =>
        countSchoolStudentsSubmitted(school.driveRawSheetId as string, school.activeSubtests),
      ),
    );
    return Math.round(perSchool.reduce((a, b) => a + b, 0));
  } catch {
    return null;
  }
}

/** Per-school piece of getStudentsSubmittedThisYear — sum over KELAS values of the average submission count across the subtests that kelas appears in. */
async function countSchoolStudentsSubmitted(
  sheetId: string,
  activeSubtestCodes: string[],
): Promise<number> {
  const activeCodes = new Set(resolveActiveSubtests(activeSubtestCodes).map((s) => s.code));
  const tabs = (await listSheetTabs(sheetId)).filter(
    (t): t is typeof t & { tabName: string } => Boolean(t.tabName) && activeCodes.has(t.code),
  );
  const rowsByTab = await batchReadTabs(
    sheetId,
    tabs.map((t) => t.tabName),
  );

  // kelas value -> submission count in each subtest tab it appears in.
  const perKelasCounts = new Map<string, number[]>();
  for (const tab of tabs) {
    const rows = rowsByTab.get(tab.tabName) ?? [];
    const header = rows[0] ?? [];
    const kelasCol = header.findIndex((h) => h?.trim().toUpperCase() === "KELAS");
    if (kelasCol === -1) continue;

    const countByKelas = new Map<string, number>();
    for (const row of rows.slice(1)) {
      const kelas = normalizeName(row[kelasCol] ?? "");
      if (!kelas) continue;
      countByKelas.set(kelas, (countByKelas.get(kelas) ?? 0) + 1);
    }
    for (const [kelas, count] of countByKelas) {
      const arr = perKelasCounts.get(kelas) ?? [];
      arr.push(count);
      perKelasCounts.set(kelas, arr);
    }
  }

  let schoolTotal = 0;
  for (const counts of perKelasCounts.values()) {
    schoolTotal += counts.reduce((a, b) => a + b, 0) / counts.length;
  }
  return schoolTotal;
}

/**
 * REKAP events whose open recap job has been running longer than
 * REKAP_ATTENTION_THRESHOLD_DAYS — surfaced on Overview so nothing silently
 * stalls in the recap stage. Oldest-waiting first.
 */
export async function getEventsNeedingAttention() {
  const threshold = new Date();
  threshold.setUTCDate(threshold.getUTCDate() - REKAP_ATTENTION_THRESHOLD_DAYS);

  return prisma.psikotesEvent.findMany({
    where: {
      status: "REKAP",
      recapJobs: { some: { finishedAt: null, startedAt: { lt: threshold } } },
    },
    orderBy: { updatedAt: "asc" },
    select: {
      id: true,
      school: { select: { name: true, slug: true } },
      recapJobs: {
        where: { finishedAt: null },
        orderBy: { startedAt: "desc" },
        take: 1,
        select: { startedAt: true },
      },
    },
  });
}

export type AttentionEventItem = Awaited<ReturnType<typeof getEventsNeedingAttention>>[number];
