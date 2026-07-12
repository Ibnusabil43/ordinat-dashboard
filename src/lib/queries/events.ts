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
 * Single event by id, or null. Includes the school (with its kelas, for the
 * detail page's "Tester" tab — BE-G3, v2.0), its links (with subtest type),
 * and the most recent recap job — enough for the detail page.
 */
export async function getEventById(id: string) {
  return prisma.psikotesEvent.findUnique({
    where: { id },
    select: {
      id: true,
      scheduledDate: true,
      status: true,
      school: {
        select: {
          id: true,
          name: true,
          slug: true,
          kelas: {
            orderBy: { order: "asc" },
            select: { id: true, name: true, tester: true },
          },
        },
      },
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

/**
 * ONGOING events for a picker (BE-J3) — these are the ones eligible to
 * enter REKAP. Shared by the internal webhook's event-listing route
 * (BE-E2, Flask's own picker) and Automated Recap's admin-session
 * `EventPicker` (FE-N1), so the two never drift into listing different sets.
 */
export async function getOngoingEventsForPicker() {
  return prisma.psikotesEvent.findMany({
    where: { status: "ONGOING" },
    orderBy: { scheduledDate: "desc" },
    select: {
      id: true,
      scheduledDate: true,
      school: { select: { name: true, slug: true } },
    },
  });
}

export type OngoingEventOption = Awaited<ReturnType<typeof getOngoingEventsForPicker>>[number];

/**
 * Events eligible for Automated Recap's picker (FE-N1, revised) — ONGOING,
 * REKAP, and DONE. Deliberately NOT the same set as getOngoingEventsForPicker:
 * that one only lists ONGOING because it's shared with the webhook's
 * "eligible to enter REKAP" check (BE-J3/BE-E2). This one backs the admin
 * picker, where re-running recap for a school already past REKAP/DONE must
 * stay possible — reprocessing a corrected raw file, or re-uploading to
 * Drive, shouldn't be locked out just because the status already advanced.
 * `status` is included so the picker can label already-recapped entries.
 */
export async function getRecapPickerEvents() {
  return prisma.psikotesEvent.findMany({
    where: { status: { in: ["ONGOING", "REKAP", "DONE"] } },
    orderBy: { scheduledDate: "desc" },
    select: {
      id: true,
      scheduledDate: true,
      status: true,
      school: { select: { name: true, slug: true } },
    },
  });
}

export type RecapPickerEventOption = Awaited<ReturnType<typeof getRecapPickerEvents>>[number];
