"use server";

/**
 * Thin Server Action wrapper around queries/monitoring.ts's
 * searchNameAcrossSheets (BE-M3) — NameCheck (FE-P3) is a client component
 * (needs pending state, submit-triggered search), so it needs an actual
 * "use server" entry point to call into, not just a plain async function.
 */
import { getCurrentUser } from "@/lib/auth-guard";
import { searchNameAcrossSheets, type NameSearchResult } from "@/lib/queries/monitoring";

/**
 * Returns null on either "no driveRawSheetId configured" or a Sheets/Drive
 * API failure — NameCheck shows the same "coba lagi" message either way,
 * it doesn't need to distinguish (unlike the page-level empty state, FE-P4,
 * which does distinguish "not configured" up front before this ever runs).
 *
 * getCurrentUser(), not requireStaff() — Monitoring is TESTER's one allowed
 * page (PRD FR-11), so this must NOT block TESTER the way every other
 * action in this app does. All 3 roles reach this.
 *
 * `kelas` is mandatory (BE-O3, v2) — every Cek Nama search is scoped to a
 * specific kelas now, there's no "search all kelas" mode.
 */
export async function searchName(
  schoolId: string,
  query: string,
  kelas: string,
): Promise<NameSearchResult[] | null> {
  if (!(await getCurrentUser())) return null;

  try {
    return await searchNameAcrossSheets(schoolId, query, kelas);
  } catch {
    return null;
  }
}
