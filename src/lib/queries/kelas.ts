import { prisma } from "@/lib/prisma";

/** All kelas for one school, ordered for stable display — admin Kelas management page (FE-K1). */
export async function getKelasBySchoolId(schoolId: string) {
  return prisma.kelas.findMany({
    where: { schoolId },
    orderBy: { order: "asc" },
    select: { id: true, name: true, tester: true, order: true },
  });
}

export type KelasListItem = Awaited<ReturnType<typeof getKelasBySchoolId>>[number];
