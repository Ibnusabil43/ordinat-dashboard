import { prisma } from "@/lib/prisma";

/**
 * Read helpers for schools. Shared by the admin list (Phase 2) and the public
 * pages (Phase 3/6), so the Prisma shape is defined once here — see BE-B4.
 */

/**
 * All schools, ordered by name. Each row carries its event count and its
 * "latest" event (by scheduled date) so both the admin table (name / slug /
 * event count) and the public card grid (date / status / link count) can be
 * rendered from one query without a second round trip.
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

/** Single school by its (unique) slug, or null. Used by the public detail page. */
export async function getSchoolBySlug(slug: string) {
  return prisma.school.findUnique({
    where: { slug },
    select: {
      id: true,
      name: true,
      slug: true,
      events: {
        orderBy: { scheduledDate: "desc" },
        take: 1,
        select: {
          id: true,
          scheduledDate: true,
          status: true,
          links: {
            select: {
              url: true,
              subtestType: { select: { code: true, label: true, order: true } },
            },
          },
        },
      },
    },
  });
}

/** Single school by id, or null. Used by the admin edit form. */
export async function getSchoolById(id: string) {
  return prisma.school.findUnique({
    where: { id },
    select: { id: true, name: true, slug: true },
  });
}

/** Lean {id, name} list for select dropdowns (e.g. the event create form). */
export async function getSchoolOptions() {
  return prisma.school.findMany({
    orderBy: { name: "asc" },
    select: { id: true, name: true },
  });
}
export type SchoolOption = Awaited<ReturnType<typeof getSchoolOptions>>[number];
