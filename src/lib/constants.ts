/**
 * 13 jenis subtes psikotes.
 *
 * PENTING: `code` HARUS sama persis dengan nama sheet di file RAW yang diproses
 * oleh Automated Recap (Flask). Mengubah kode di sini tanpa menyamakan dengan
 * tool rekap akan memutus pencocokan skor. Lihat CLAUDE.md > Integrasi.
 *
 * `order` menentukan urutan tampil di grid link & form manajemen link.
 *
 * PAPI tidak selalu dipakai di setiap sekolah/event — itu bukan masalah, link
 * dan sheet RAW sama-sama sudah menerima kode tanpa isi (LinkTable menampilkan
 * "Belum tersedia", Monitoring menghitung 0 kalau tab-nya tidak ada).
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
  { code: "PAPI", label: "PAPI", order: 13 },
] as const;

export const SUBTEST_CODES = SUBTEST_TYPES.map((s) => s.code);

/**
 * SubtestLink.checkStatus values that count as "genuinely filled" for the
 * "Link Terisi" counts (queries/events.ts) — only a confirmed-good "Cek
 * Link" result. A link with no check yet (checkStatus null) still counts —
 * running the check is optional, so an unrun check isn't treated as a
 * warning. Anything actively flagged bad (not_found/wrong_school/error)
 * does not count, which is the whole point: a stale "12/13 filled" number
 * shouldn't hide that some of those 12 are wrong. See
 * server/actions/link-check.ts.
 */
export const LINK_CHECK_OK_STATUSES = ["match"] as const;

/**
 * Resolves a School's `activeSubtests` column to the actual subtest list, in
 * canonical order. CONVENTION (see schema.prisma): an empty array means
 * "all 13" — that's how existing rows (defaulted to []) and schools where
 * every subtest is active both behave, so callers never special-case the
 * unconfigured state. Unknown codes are ignored defensively.
 */
export function resolveActiveSubtests(codes: readonly string[]): readonly SubtestType[] {
  if (codes.length === 0) return SUBTEST_TYPES;
  const active = new Set(codes);
  const filtered = SUBTEST_TYPES.filter((s) => active.has(s.code));
  return filtered.length > 0 ? filtered : SUBTEST_TYPES;
}

/**
 * Parses the checked subtest codes from a "subtest" checkbox group (one
 * `subtest` field per checked box) into School.activeSubtests, keeping only
 * known codes in canonical order. Selecting all 13 (or none) collapses to []
 * — the "all 13" convention above — so the common case leaves the column
 * empty and only a genuine subset is stored explicitly.
 */
export function parseActiveSubtests(formData: FormData): string[] {
  const checked = new Set(
    formData.getAll("subtest").filter((v): v is string => typeof v === "string"),
  );
  const selected = SUBTEST_CODES.filter((code) => checked.has(code));
  return selected.length === SUBTEST_CODES.length ? [] : selected;
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

/**
 * Display names for `Kelas.tester` (PIC_LAPANGAN + TESTER-role staff — the
 * people who actually proctor a kelas on-site). Deliberately just the human
 * name, never the login username — `Kelas.tester` is unrelated to the
 * TESTER account role and must not be confused with it (CLAUDE.md > Domain
 * > Kelas & tester). ADMIN staff aren't included; they don't proctor.
 * Populates the dropdown in KelasManager — add a name here when a new
 * field PIC/tester joins.
 */
export const KNOWN_TESTER_NAMES: readonly string[] = [
  "Achmad Fauzan Dwi Putra, S.Psi",
  "Alya Rachmasari, S.Psi.",
  "Assyifa Nur Rumaisha, S.Psi",
  "Dhefi Dwicahyani Fikri, S.Psi",
  "Farah Fauziyah, S.Psi., M.A.",
  "Ghina Devina Xaviera, M.Psi., Psikolog",
  "Gina Safitri Rachmatillah, S.Psi",
  "Helma Fitria Hendra, S.Psi",
  "Muhamad Noviyanto Margono, S.Psi., M.M.",
  "Nazilatul Fakhirah, S.Psi.",
  "Nisya Nur Alfilail, S.Psi",
  "Risma Santika, S.Psi",
  "Roseyoana Logisian Subekti, S.Psi., Gr.",
  "Sheila Aisma Nurbillah, M.Psi.,Psikolog",
  "Syifa Fauziyyah Hendra, S.Psi",
  "Tanthie Eka Ratnasari, S.Psi",
  "Tifa Kamila, S.Psi",
  "Wulan Tresna Kusumah, S.Psi.",
  "Yuniar Noor Fitriyanti, S.Psi",
] as const;
