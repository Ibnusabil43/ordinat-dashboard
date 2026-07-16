import { prisma } from "@/lib/prisma";
import { resolveActiveSubtests } from "@/lib/constants";
import { FILLED_LINK_WHERE } from "@/lib/queries/events";

/** Read helpers for schools — see BE-B4. */

/**
 * All schools, ordered by name. Each row carries its event count and its
 * "latest" event (by scheduled date, status, link count) for the admin table.
 */
export async function getSchools() {
  return prisma.school.findMany({
    orderBy: { name: "asc" },
    select: {
      id: true,
      name: true,
      slug: true,
      _count: { select: { events: true } },
      events: {
        orderBy: { scheduledDate: "desc" },
        take: 1,
        select: {
          id: true,
          scheduledDate: true,
          status: true,
          _count: { select: { links: true } },
        },
      },
    },
  });
}

export type SchoolListItem = Awaited<ReturnType<typeof getSchools>>[number];

/** Single school by id, or null. Used by the admin edit form. */
export async function getSchoolById(id: string) {
  return prisma.school.findUnique({
    where: { id },
    select: {
      id: true,
      name: true,
      slug: true,
      driveRawSheetId: true,
      driveFormFolderId: true,
      activeSubtests: true,
    },
  });
}

/** School list for the Classes menu (Phase 19, FE-S1) — id, name, and its kelas count for the row. */
export async function getSchoolsForClasses() {
  return prisma.school.findMany({
    orderBy: { name: "asc" },
    select: { id: true, name: true, _count: { select: { kelas: true } } },
  });
}
export type SchoolForClasses = Awaited<ReturnType<typeof getSchoolsForClasses>>[number];

/** Lean {id, name} list for select dropdowns (e.g. the event create form). */
export async function getSchoolOptions() {
  return prisma.school.findMany({
    orderBy: { name: "asc" },
    select: { id: true, name: true },
  });
}
export type SchoolOption = Awaited<ReturnType<typeof getSchoolOptions>>[number];

export type SchoolLinkStatus = "ok" | "incomplete" | "none";

export interface RecentSchool {
  id: string;
  name: string;
  hasRawSheet: boolean;
  hasFormFolder: boolean;
  linkStatus: SchoolLinkStatus;
}

/**
 * Last N schools created, newest first (Overview's "Recently Added Schools"
 * table). Per-row connection status is read straight from stored fields —
 * no live Sheets/Drive calls here, unlike getStudentsSubmittedThisYear — so
 * this stays cheap enough to sit on the main Overview render, not behind
 * Suspense. `linkStatus` compares the latest event's filled-link count
 * (FILLED_LINK_WHERE, same definition "Link Terisi" uses elsewhere) against
 * how many subtests the school actually runs: "none" = no event yet, "ok" =
 * every active subtest has a good link, "incomplete" = some don't.
 */
export async function getRecentlyAddedSchools(limit = 5): Promise<RecentSchool[]> {
  const schools = await prisma.school.findMany({
    orderBy: { createdAt: "desc" },
    take: limit,
    select: {
      id: true,
      name: true,
      driveRawSheetId: true,
      driveFormFolderId: true,
      activeSubtests: true,
      events: {
        orderBy: { scheduledDate: "desc" },
        take: 1,
        select: { _count: { select: { links: { where: FILLED_LINK_WHERE } } } },
      },
    },
  });

  return schools.map((s) => {
    const latestEvent = s.events[0];
    const activeCount = resolveActiveSubtests(s.activeSubtests).length;
    const linkStatus: SchoolLinkStatus = !latestEvent
      ? "none"
      : latestEvent._count.links >= activeCount
        ? "ok"
        : "incomplete";

    return {
      id: s.id,
      name: s.name,
      hasRawSheet: Boolean(s.driveRawSheetId),
      hasFormFolder: Boolean(s.driveFormFolderId),
      linkStatus,
    };
  });
}
