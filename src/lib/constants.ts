/**
 * 12 jenis subtes psikotes.
 *
 * PENTING: `code` HARUS sama persis dengan nama sheet di file RAW yang diproses
 * oleh Automated Recap (Flask). Mengubah kode di sini tanpa menyamakan dengan
 * tool rekap akan memutus pencocokan skor. Lihat CLAUDE.md > Integrasi.
 *
 * `order` menentukan urutan tampil di grid link & form manajemen link.
 */

export interface SubtestType {
  code: string;
  label: string;
  order: number;
}

export const SUBTEST_TYPES: readonly SubtestType[] = [
  { code: "EPPS", label: "EPPS", order: 1 },
  { code: "SE", label: "SE", order: 2 },
  { code: "WA", label: "WA", order: 3 },
  { code: "AN", label: "AN", order: 4 },
  { code: "GE", label: "GE", order: 5 },
  { code: "RA", label: "RA", order: 6 },
  { code: "ZR", label: "ZR", order: 7 },
  { code: "FA", label: "FA", order: 8 },
  { code: "WU", label: "WU", order: 9 },
  { code: "ME", label: "ME", order: 10 },
  { code: "RIASEC", label: "RIASEC", order: 11 },
  { code: "GB", label: "Gaya Belajar", order: 12 },
] as const;

export const SUBTEST_CODES = SUBTEST_TYPES.map((s) => s.code);

/**
 * Resolves a PsikotesEvent's `activeSubtests` column to the actual subtest
 * list, in canonical order. CONVENTION (see schema.prisma): an empty array
 * means "all 12" — that's how existing rows (defaulted to []) and events
 * where every subtest is active both behave, so callers never special-case
 * the unconfigured state. Unknown codes are ignored defensively.
 */
export function resolveActiveSubtests(codes: readonly string[]): readonly SubtestType[] {
  if (codes.length === 0) return SUBTEST_TYPES;
  const active = new Set(codes);
  const filtered = SUBTEST_TYPES.filter((s) => active.has(s.code));
  return filtered.length > 0 ? filtered : SUBTEST_TYPES;
}

/**
 * Contoh pola URL tiny.cc: http://tiny.cc/{SLUG}-{CODE}
 * mis. slug "CIWARINGIN26" + code "EPPS" -> http://tiny.cc/CIWARINGIN26-EPPS
 * Ini hanya saran default saat admin membuat link; URL final tetap bebas diedit.
 */
export function suggestTinyUrl(slug: string, code: string): string {
  return `http://tiny.cc/${slug}-${code}`;
}

/**
 * Admin login uses a username, but Supabase Auth is email-based under the
 * hood — there is no native "username" concept in Supabase Auth. Every
 * username is mapped to a synthetic email under this fixed internal domain
 * before calling supabase.auth.signInWithPassword. This domain is never
 * used for real mail delivery.
 *
 * IMPORTANT: when creating a new admin account (Supabase Studio > Add user,
 * or the Admin API), the "email" field must be set to
 * `{desired-username}@${AUTH_EMAIL_DOMAIN}` — anything else won't be
 * reachable through the login form. See CLAUDE.md > Auth model.
 */
export const AUTH_EMAIL_DOMAIN = "ordinat.id";

export function usernameToAuthEmail(username: string): string {
  return `${username.trim().toLowerCase()}@${AUTH_EMAIL_DOMAIN}`;
}

/** Inverse of usernameToAuthEmail — for display only (e.g. sidebar footer). */
export function authEmailToUsername(email: string): string {
  return email.split(`@${AUTH_EMAIL_DOMAIN}`)[0] ?? email;
}

/**
 * How many days an event can sit in REKAP with an open recap job before it
 * surfaces in Overview's "needs attention" list (BE-F2).
 */
export const REKAP_ATTENTION_THRESHOLD_DAYS = 3;
