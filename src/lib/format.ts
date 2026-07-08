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
