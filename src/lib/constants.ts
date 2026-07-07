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
 * Contoh pola URL tiny.cc: http://tiny.cc/{SLUG}-{CODE}
 * mis. slug "CIWARINGIN26" + code "EPPS" -> http://tiny.cc/CIWARINGIN26-EPPS
 * Ini hanya saran default saat admin membuat link; URL final tetap bebas diedit.
 */
export function suggestTinyUrl(slug: string, code: string): string {
  return `http://tiny.cc/${slug}-${code}`;
}
