/**
 * Skema Zod — validasi input di server action & route handler.
 * Semua mutasi wajib divalidasi lewat sini sebelum menyentuh Prisma.
 */
import { z } from "zod";
import { SUBTEST_CODES } from "@/lib/constants";
import { extractDriveResourceId } from "@/lib/drive-id";

export const schoolSchema = z.object({
  name: z.string().trim().min(3, "School name must be at least 3 characters"),
  // slug is used in the tiny.cc URL — letters/numbers/dash only, uppercase.
  slug: z
    .string()
    .trim()
    .toUpperCase()
    .regex(/^[A-Z0-9-]+$/, "Slug may only contain letters, numbers, and '-'"),
  // Persisted School column (BE-L1) — the ID of the one spreadsheet with 12
  // tabs Monitoring reads from. Accepts either a bare ID or a pasted full
  // Sheets URL — extractDriveResourceId pulls the ID out either way, so the
  // admin never has to manually trim a URL down. Empty string means "not
  // set", same as null.
  driveRawSheetId: z
    .string()
    .trim()
    .transform((v) => (v ? extractDriveResourceId(v) : null))
    .optional(),
  // Drive folder ID holding this school's Google Forms — used by the "Cek
  // Link" feature (google-forms-check.ts). Same bare-ID-or-full-URL and
  // empty-string-means-null handling as driveRawSheetId above.
  driveFormFolderId: z
    .string()
    .trim()
    .transform((v) => (v ? extractDriveResourceId(v) : null))
    .optional(),
});
export type SchoolInput = z.infer<typeof schoolSchema>;

// Kelas: name is required, tester is optional free text (BE-G1). Both fields
// are submitted independently from inline-editable table cells (FE-K2), so
// each is validated on its own rather than as one combined object.
export const kelasNameSchema = z.string().trim().min(1, "Class name is required");
export const kelasTesterSchema = z
  .string()
  .trim()
  .transform((v) => v || null);

// Used by the inline date editor on the schedule's detail page (user
// request, post-19-7 — the standalone create/edit event routes and their
// shared `eventSchema` are gone; a school's PsikotesEvent is always created
// alongside the school itself now, only its date is ever edited here).
// Kept as a string so we control the error message; coerce.date's
// invalid-date message can't be overridden reliably. Input is "YYYY-MM-DD"
// from <input type="date">, transformed to a Date for Prisma. Required —
// once you're actively setting a date via this editor, blank isn't a valid
// submission (leaving it unset is just... not opening the editor).
export const scheduledDateSchema = z
  .string()
  .min(1, "Date is required")
  .refine((s) => !Number.isNaN(new Date(s).getTime()), "Invalid date")
  .transform((s) => new Date(s));

// Link management form: map of code -> url (may be empty = not filled in yet).
export const subtestLinksSchema = z.object({
  eventId: z.string().cuid(),
  links: z
    .array(
      z.object({
        code: z.enum(SUBTEST_CODES as [string, ...string[]]),
        url: z.string().trim().url("Invalid URL").or(z.literal("")),
      }),
    )
    .max(SUBTEST_CODES.length),
});
export type SubtestLinksInput = z.infer<typeof subtestLinksSchema>;

// Username, not email — mapped to a synthetic email internally.
// See usernameToAuthEmail in src/lib/constants.ts and CLAUDE.md > Auth model.
export const loginSchema = z.object({
  username: z
    .string()
    .trim()
    .toLowerCase()
    .min(3, "Username must be at least 3 characters")
    .regex(/^[a-z0-9_.-]+$/, "Username may only contain lowercase letters, numbers, dots, underscores, and dashes"),
  password: z.string().min(1),
});
