/**
 * Skema Zod — validasi input di server action & route handler.
 * Semua mutasi wajib divalidasi lewat sini sebelum menyentuh Prisma.
 */
import { z } from "zod";
import { SUBTEST_CODES } from "@/lib/constants";

export const schoolSchema = z.object({
  name: z.string().trim().min(3, "Nama sekolah minimal 3 karakter"),
  // slug dipakai di URL tiny.cc — huruf/angka/dash saja, uppercase.
  slug: z
    .string()
    .trim()
    .toUpperCase()
    .regex(/^[A-Z0-9-]+$/, "Slug hanya boleh huruf, angka, dan tanda '-'"),
  // Bulk-create shortcut only (BE-G4) — not persisted as its own field, just
  // creates N empty Kelas rows alongside the school. Absent/0 = create none.
  kelasCount: z.coerce.number().int().min(0).max(50).optional(),
  // Persisted School column (BE-L1) — the ID of the one spreadsheet with 12
  // tabs Monitoring reads from. Empty string means "not set", same as null.
  driveRawSheetId: z
    .string()
    .trim()
    .transform((v) => v || null)
    .optional(),
});
export type SchoolInput = z.infer<typeof schoolSchema>;

// Kelas: name is required, tester is optional free text (BE-G1). Both fields
// are submitted independently from inline-editable table cells (FE-K2), so
// each is validated on its own rather than as one combined object.
export const kelasNameSchema = z.string().trim().min(1, "Nama kelas wajib diisi");
export const kelasTesterSchema = z
  .string()
  .trim()
  .transform((v) => v || null);

export const eventSchema = z.object({
  schoolId: z.string().min(1, "Pilih sekolah").cuid("Sekolah tidak valid"),
  // Kept as a string so we control the (Indonesian) messages; coerce.date's
  // invalid-date message can't be overridden reliably. Transformed to a Date
  // for Prisma. Input is "YYYY-MM-DD" from <input type="date">.
  scheduledDate: z
    .string()
    .min(1, "Tanggal wajib diisi")
    .refine((s) => !Number.isNaN(new Date(s).getTime()), "Tanggal tidak valid")
    .transform((s) => new Date(s)),
});
export type EventInput = z.infer<typeof eventSchema>;

// Form manajemen link: peta code -> url (boleh kosong = belum diisi).
export const subtestLinksSchema = z.object({
  eventId: z.string().cuid(),
  links: z
    .array(
      z.object({
        code: z.enum(SUBTEST_CODES as [string, ...string[]]),
        url: z.string().trim().url("URL tidak valid").or(z.literal("")),
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
    .min(3, "Username minimal 3 karakter")
    .regex(/^[a-z0-9_.-]+$/, "Username hanya boleh huruf kecil, angka, titik, underscore, dan dash"),
  password: z.string().min(1),
});
