import { prisma } from "@/lib/prisma";
import { REKAP_ATTENTION_THRESHOLD_DAYS } from "@/lib/constants";

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
