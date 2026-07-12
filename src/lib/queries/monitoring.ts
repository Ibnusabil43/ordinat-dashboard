/**
 * Read helpers for the Monitoring Dashboard (BE-M1, BE-M3, PRD FR-11).
 * Both functions read live from the school's Drive Raw Sheet on every call —
 * never cached/persisted in Postgres (PRD §7). Callers should expect these
 * to throw on a Sheets/Drive API failure (bad sharing, revoked access, etc.)
 * — that's a distinct error state from "driveRawSheetId not set" (FE-P4),
 * which callers check for themselves before calling these.
 */
import { prisma } from "@/lib/prisma";
import { listSheetTabs, readTabRows } from "@/lib/google-sheets";
import { matchesName } from "@/lib/name-match";

export interface SubtestSubmissionCount {
  code: string;
  label: string;
  count: number;
}

/** Lean {id, name, driveRawSheetId} list for the Monitoring school list (FE-P1) — not the full getSchools() shape, nothing else needed here. */
export async function getSchoolsForMonitoring() {
  return prisma.school.findMany({
    orderBy: { name: "asc" },
    select: { id: true, name: true, driveRawSheetId: true },
  });
}

export type SchoolForMonitoring = Awaited<ReturnType<typeof getSchoolsForMonitoring>>[number];

/**
 * Subtest links for a school's most recent event — the "Link" tab on the
 * Monitoring dashboard, so TESTER (who can't reach Event Detail) still has
 * somewhere to see them. Independent of driveRawSheetId on purpose — stays
 * reachable even when the raw sheet isn't configured yet. Empty array if
 * the school has no events at all (LinkTable already renders that as
 * "Belum tersedia" per subtest, no separate empty state needed here).
 */
export async function getLatestEventLinks(schoolId: string) {
  const event = await prisma.psikotesEvent.findFirst({
    where: { schoolId },
    orderBy: { scheduledDate: "desc" },
    select: {
      links: {
        select: {
          url: true,
          subtestType: { select: { code: true, label: true, order: true } },
        },
      },
    },
  });
  return event?.links ?? [];
}

/**
 * Per-subtest submission counts for one school (BE-M1) — row count of each
 * of the 12 tabs, minus the header row. A subtest with no matching tab in
 * the sheet counts as 0, not an error (the sheet may genuinely be missing
 * that tab, or still be in progress).
 */
export async function getSubmissionSummary(schoolId: string): Promise<SubtestSubmissionCount[] | null> {
  const school = await prisma.school.findUnique({
    where: { id: schoolId },
    select: { driveRawSheetId: true },
  });
  if (!school?.driveRawSheetId) return null;

  const tabs = await listSheetTabs(school.driveRawSheetId);
  return Promise.all(
    tabs.map(async ({ code, label, tabName }) => {
      if (!tabName) return { code, label, count: 0 };
      const rows = await readTabRows(school.driveRawSheetId!, tabName);
      return { code, label, count: Math.max(rows.length - 1, 0) };
    }),
  );
}

export interface NameSearchResult {
  code: string;
  label: string;
  found: boolean;
  /** KELAS value from the matched row, only set when found — lets the admin see which kelas submitted this subtest, not just that it exists. */
  kelas: string | null;
}

/**
 * Searches one school's 12 tabs for a name (BE-M3) — resolves the "NAMA
 * LENGKAP" and "KELAS" columns per tab by header (position varies slightly
 * between real-world sheets, so this never assumes a fixed index) and runs
 * BE-M2's lightweight matcher against every row in the name column.
 */
export async function searchNameAcrossSheets(
  schoolId: string,
  query: string,
): Promise<NameSearchResult[] | null> {
  const school = await prisma.school.findUnique({
    where: { id: schoolId },
    select: { driveRawSheetId: true },
  });
  if (!school?.driveRawSheetId) return null;

  const tabs = await listSheetTabs(school.driveRawSheetId);
  return Promise.all(
    tabs.map(async ({ code, label, tabName }) => {
      if (!tabName) return { code, label, found: false, kelas: null };
      const rows = await readTabRows(school.driveRawSheetId!, tabName);
      const header = rows[0] ?? [];
      const nameCol = header.findIndex((h) => h?.trim().toUpperCase() === "NAMA LENGKAP");
      if (nameCol === -1) return { code, label, found: false, kelas: null };
      const kelasCol = header.findIndex((h) => h?.trim().toUpperCase() === "KELAS");

      const matchedRow = rows.slice(1).find((row) => matchesName(query, row[nameCol] ?? ""));
      if (!matchedRow) return { code, label, found: false, kelas: null };

      const kelas = kelasCol !== -1 ? matchedRow[kelasCol]?.trim() || null : null;
      return { code, label, found: true, kelas };
    }),
  );
}
