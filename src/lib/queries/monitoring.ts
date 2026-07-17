/**
 * Read helpers for the Monitoring Dashboard (BE-M1, BE-M3, PRD FR-11).
 * Both functions read live from the school's Drive Raw Sheet on every call —
 * never cached/persisted in Postgres (PRD §7). Callers should expect these
 * to throw on a Sheets/Drive API failure (bad sharing, revoked access, etc.)
 * — that's a distinct error state from "driveRawSheetId not set" (FE-P4),
 * which callers check for themselves before calling these.
 */
import { prisma } from "@/lib/prisma";
import { listSheetTabs, batchReadTabs } from "@/lib/google-sheets";
import { scoreNameMatch, normalizeName, MATCH_THRESHOLD } from "@/lib/name-match";

/**
 * "Confident winner" thresholds (BE-O3) — plain arithmetic over the scores
 * scoreNameMatch already produced, not another fuzzy-matching signal. A top
 * candidate only counts as a confident winner if it clears CONFIDENT_MIN_SCORE
 * AND beats every other candidate (any kelas) by at least CONFIDENT_MARGIN.
 * Otherwise the tab resolves to "ambiguous" rather than silently picking one.
 */
const CONFIDENT_MIN_SCORE = 0.9;
const CONFIDENT_MARGIN = 0.15;

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
          checkStatus: true,
          checkMessage: true,
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
  // Only subtests that actually have a tab in this school's raw sheet are
  // shown (user request) — a subtest with no matching tab isn't rendered at
  // all, rather than as a misleading "0".
  const presentTabs = tabs.filter((t): t is typeof t & { tabName: string } => Boolean(t.tabName));
  // One batched read for every present tab, instead of one call per tab.
  const rowsByTab = await batchReadTabs(
    school.driveRawSheetId,
    presentTabs.map((t) => t.tabName),
  );
  return presentTabs.map(({ code, label, tabName }) => {
    const rows = rowsByTab.get(tabName) ?? [];
    return { code, label, count: Math.max(rows.length - 1, 0) };
  });
}

export interface NameMatchCandidate {
  name: string;
  kelas: string | null;
  score: number;
}

export interface NameSearchResult {
  code: string;
  label: string;
  status: "not_found" | "found" | "found_elsewhere" | "ambiguous";
  /** Every surviving candidate (score >= MATCH_THRESHOLD), ranked by score descending — [] only for not_found. matches[0] is the one `status` is about; the rest are "other possibilities" the UI can offer to expand, even when status is a confident found/found_elsewhere. */
  matches: NameMatchCandidate[];
}

function emptyResult(code: string, label: string): NameSearchResult {
  return { code, label, status: "not_found", matches: [] };
}

/**
 * Searches one school's 12+ tabs for a name, scoped to a specific kelas
 * (BE-O3, v2 of BE-M3) — resolves the "NAMA LENGKAP" and "KELAS" columns per
 * tab by header (position varies slightly between real-world sheets, so this
 * never assumes a fixed index), scores every row with scoreNameMatch (not
 * just the first hit like v1's `.find()`), and resolves a status via the
 * "confident winner" rule above. `kelas` is mandatory — every Cek Nama search
 * is now scoped to a specific kelas, there's no "search all kelas" mode.
 */
export async function searchNameAcrossSheets(
  schoolId: string,
  query: string,
  kelas: string,
): Promise<NameSearchResult[] | null> {
  const school = await prisma.school.findUnique({
    where: { id: schoolId },
    select: { driveRawSheetId: true },
  });
  if (!school?.driveRawSheetId) return null;

  const tabs = await listSheetTabs(school.driveRawSheetId);
  // Only search subtests that actually have a tab in the raw sheet (user
  // request) — an absent subtest doesn't appear in the results at all,
  // instead of returning a misleading "not found". A subtest whose tab DOES
  // exist but doesn't contain the name still resolves to not_found below.
  const presentTabs = tabs.filter((t): t is typeof t & { tabName: string } => Boolean(t.tabName));
  // One batched read for every present tab, instead of one call per tab.
  const rowsByTab = await batchReadTabs(
    school.driveRawSheetId,
    presentTabs.map((t) => t.tabName),
  );
  const targetKelas = normalizeName(kelas);

  return presentTabs.map(({ code, label, tabName }) => {
    const rows = rowsByTab.get(tabName) ?? [];
    const header = rows[0] ?? [];
    const nameCol = header.findIndex((h) => h?.trim().toUpperCase() === "NAMA LENGKAP");
    if (nameCol === -1) return emptyResult(code, label);
    const kelasCol = header.findIndex((h) => h?.trim().toUpperCase() === "KELAS");

    const candidates: NameMatchCandidate[] = rows
      .slice(1)
      .map((row): NameMatchCandidate | null => {
        const score = scoreNameMatch(query, row[nameCol] ?? "");
        if (score < MATCH_THRESHOLD) return null;
        return {
          name: row[nameCol] ?? "",
          kelas: kelasCol !== -1 ? row[kelasCol]?.trim() || null : null,
          score,
        };
      })
      .filter((c): c is NameMatchCandidate => c !== null)
      .sort((a, b) => b.score - a.score);

    if (candidates.length === 0) return emptyResult(code, label);

    const [winner, runnerUp] = candidates;
    const isConfidentWinner =
      winner.score >= CONFIDENT_MIN_SCORE && (!runnerUp || winner.score - runnerUp.score >= CONFIDENT_MARGIN);

    if (!isConfidentWinner) {
      return { code, label, status: "ambiguous", matches: candidates };
    }

    // No KELAS column, or the winner's row has no kelas value — can't check
    // for a mismatch either way, so a confident winner counts as found.
    const matchesKelas =
      kelasCol === -1 || winner.kelas === null || normalizeName(winner.kelas) === targetKelas;

    // `matches` always carries every surviving candidate, not just the
    // winner — `status` only says how confident the top one is, it doesn't
    // gate what's returned. Lets the UI offer "other possibilities" even on
    // a confident `found`/`found_elsewhere` result, for a human to double-
    // check rather than blindly trusting the top pick.
    return {
      code,
      label,
      status: matchesKelas ? "found" : "found_elsewhere",
      matches: candidates,
    };
  });
}
