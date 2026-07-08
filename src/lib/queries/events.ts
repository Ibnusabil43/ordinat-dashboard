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
