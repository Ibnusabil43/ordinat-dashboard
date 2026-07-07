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
});
export type SchoolInput = z.infer<typeof schoolSchema>;

export const eventSchema = z.object({
  schoolId: z.string().cuid(),
  scheduledDate: z.coerce.date(),
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

export const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email(),
  password: z.string().min(1),
});
