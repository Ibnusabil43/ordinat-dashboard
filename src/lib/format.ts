/**
 * Date helpers. Scheduled dates are stored as date-only at UTC midnight, so we
 * format in UTC to avoid a timezone shift moving the calendar day.
 */

const idDate = new Intl.DateTimeFormat("id-ID", {
  dateStyle: "long",
  timeZone: "UTC",
});

/** e.g. "1 Agustus 2026" */
export function formatDateID(date: Date): string {
  return idDate.format(date);
}

/** "YYYY-MM-DD" for prefilling an <input type="date">. */
export function toDateInputValue(date: Date): string {
  return date.toISOString().slice(0, 10);
}

/** "DD/MM/YYYY" — the free-text format Automated Recap's Tanggal Pemeriksaan field expects (FE-N2). */
export function toDDMMYYYY(date: Date): string {
  const d = String(date.getUTCDate()).padStart(2, "0");
  const m = String(date.getUTCMonth() + 1).padStart(2, "0");
  const y = date.getUTCFullYear();
  return `${d}/${m}/${y}`;
}

/**
 * Builds the "copy all links" plain-text block for the public school detail
 * page — see DESIGN.md §5 "Copy-all-links button" and PRD FR-2 for the exact
 * format. School name is forced uppercase; subtests without a url are
 * skipped (no blank lines); `label` is used, not `code` (matters for
 * Gaya Belajar / GB).
 */
export function buildLinkCopyText(
  schoolName: string,
  links: { label: string; url: string }[],
): string {
  const lines = links.filter((l) => l.url).map((l) => `${l.label} : ${l.url}`);
  return [`LINK PSIKOTES ${schoolName.toUpperCase()}`, ...lines].join("\n");
}
