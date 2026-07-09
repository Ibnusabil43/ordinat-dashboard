import { prisma } from "@/lib/prisma";

/**
 * Read helpers for psikotes events. Shared by the admin list/detail (Phase 4)
 * and — via the joined shape — reused where events surface elsewhere (BE-C5).
 */

/** All events, newest scheduled first, with school + filled-link count for the list. */
export async function getEvents() {
  return prisma.psikotesEvent.findMany({
    orderBy: { scheduledDate: "desc" },
    select: {
      id: true,
      scheduledDate: true,
      status: true,
      school: { select: { id: true, name: true, slug: true } },
      _count: { select: { links: true } },
    },
  });
}

export type EventListItem = Awaited<ReturnType<typeof getEvents>>[number];

/**
 * Single event by id, or null. Includes the school, its links (with subtest
 * type), and the most recent recap job — enough for the detail page.
 */
export async function getEventById(id: string) {
  return prisma.psikotesEvent.findUnique({
    where: { id },
    select: {
      id: true,
      scheduledDate: true,
      status: true,
      school: { select: { id: true, name: true, slug: true } },
      _count: { select: { links: true } },
      links: {
        select: {
          url: true,
          subtestType: { select: { code: true, label: true, order: true } },
        },
      },
      recapJobs: {
        orderBy: { startedAt: "desc" },
        take: 1,
        select: { id: true, startedAt: true, finishedAt: true, triggeredBy: true },
      },
    },
  });
}

export type EventDetail = NonNullable<Awaited<ReturnType<typeof getEventById>>>;

/**
 * Events currently in REKAP, for the Rekap Menu (FE-I1). Ordered by when recap
 * started (oldest first — those have been waiting longest). Carries the open
 * recap job's startedAt so the UI can show "since when".
 */
export async function getRekapEvents() {
  return prisma.psikotesEvent.findMany({
    where: { status: "REKAP" },
    orderBy: { updatedAt: "asc" },
    select: {
      id: true,
      scheduledDate: true,
      school: { select: { name: true, slug: true } },
      recapJobs: {
        where: { finishedAt: null },
        orderBy: { startedAt: "desc" },
        take: 1,
        select: { startedAt: true, triggeredBy: true },
      },
    },
  });
}

export type RekapEventItem = Awaited<ReturnType<typeof getRekapEvents>>[number];
