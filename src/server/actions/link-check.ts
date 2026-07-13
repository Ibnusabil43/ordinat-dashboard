"use server";

/**
 * "Cek Link" (link integrity check) — manual, on-demand verification that
 * each active subtest's saved tiny.cc URL actually resolves to a Google
 * Form inside the school's Drive form folder. See google-forms-check.ts for
 * why this needs both the Drive and Forms APIs, and the infra prerequisites
 * (folder shared with the service account, Forms API enabled).
 *
 * Checks layered from most to least certain:
 *  - does the link resolve to a Google Form at all? (not_found)
 *  - is that form in THIS school's folder? if not, is it in some OTHER
 *    configured school's folder? (wrong_school)
 *  - do two subtests point at the SAME form? (duplicate — a copy-paste that
 *    plain folder-membership can't catch, since both forms are "in folder")
 *  - does a matched form's title clearly name a DIFFERENT subtest?
 *    (title_mismatch — a conservative heuristic; see the pass below)
 * Positive subtest auto-matching by title is deliberately NOT attempted —
 * real titles are too inconsistent (e.g. SE's form is titled "IST") — so the
 * resolved title is surfaced for the admin's own final eyeball check too.
 *
 * Results are persisted onto SubtestLink (checkStatus/checkMessage/
 * checkedAt) — not just returned to the caller — so "Link Terisi" counts
 * (queries/events.ts) and Monitoring's Link tab can show the same warnings
 * without re-running the check on every page load.
 */
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth-guard";
import { resolveActiveSubtests } from "@/lib/constants";
import {
  buildFolderFormIndex,
  resolveShortUrl,
  extractFormIdCandidates,
  type FolderFormEntry,
} from "@/lib/google-forms-check";

/**
 * Overall backstop for a folder-index build. The per-request timeouts in
 * google-forms-check.ts cover the Drive/Forms API calls, but the Google
 * OAuth token acquisition (inside getServiceAccountAuth) has no timeout of
 * its own — so this wraps the whole build to guarantee it can't hang the
 * action indefinitely, whatever stalls.
 */
const FOLDER_BUILD_TIMEOUT_MS = 25000;

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) => setTimeout(() => reject(new Error("timeout")), ms)),
  ]);
}

/** Uppercase whole-word tokens of a string — "WU (8)" -> {"WU","8"}. Used for title-vs-subtest checks so a code only matches as a standalone token, never a substring (e.g. "AN" must not match inside "ANALISIS"). */
function tokenize(s: string): Set<string> {
  return new Set(
    s
      .toUpperCase()
      .replace(/[^A-Z0-9]+/g, " ")
      .trim()
      .split(/\s+/)
      .filter(Boolean),
  );
}

export type LinkCheckStatus =
  | "match"
  | "no_link"
  | "not_found"
  | "wrong_school"
  | "duplicate"
  | "title_mismatch"
  | "error";

export interface LinkCheckResult {
  code: string;
  label: string;
  status: LinkCheckStatus;
  /** The resolved form's actual title — set on "match" and "wrong_school", for the admin's own eyeball check against the subtest. */
  matchedTitle?: string;
  /** Human-readable reason, set for every non-"match"/"no_link" status. */
  message?: string;
}

export interface LinkCheckState {
  /** Top-level failure — nothing ran (e.g. folder not configured, Drive/Forms API unreachable). */
  error?: string;
  results?: LinkCheckResult[];
}

export async function checkSubtestLinks(eventId: string): Promise<LinkCheckState> {
  const guard = await requireAdmin();
  if ("error" in guard) return { error: guard.error };

  const event = await prisma.psikotesEvent.findUnique({
    where: { id: eventId },
    select: {
      school: { select: { id: true, name: true, activeSubtests: true, driveFormFolderId: true } },
      links: {
        select: {
          url: true,
          subtestType: { select: { id: true, code: true } },
        },
      },
    },
  });
  if (!event) return { error: "Jadwal tidak ditemukan." };
  if (!event.school.driveFormFolderId) {
    return {
      error:
        "Folder Drive form belum diatur untuk sekolah ini. Atur dulu Drive Form Folder ID di Manajemen Sekolah.",
    };
  }

  const subtests = resolveActiveSubtests(event.school.activeSubtests);
  const urlByCode = new Map(event.links.map((l) => [l.subtestType.code, l.url]));
  const subtestTypeIdByCode = new Map(event.links.map((l) => [l.subtestType.code, l.subtestType.id]));

  let ownIndex: Map<string, FolderFormEntry>;
  try {
    ownIndex = await withTimeout(
      buildFolderFormIndex(event.school.driveFormFolderId),
      FOLDER_BUILD_TIMEOUT_MS,
    );
  } catch {
    return {
      error:
        "Gagal membaca folder Drive sekolah ini (timeout atau akses ditolak). Pastikan folder sudah dibagikan ke service account, dan Google Drive API + Forms API sudah aktif di Google Cloud Console.",
    };
  }

  // First pass against this school's own folder — cheap, no cross-school
  // lookups needed unless something doesn't match here.
  interface Pending {
    code: string;
    label: string;
    candidates: string[];
  }
  const results: LinkCheckResult[] = [];
  const pending: Pending[] = [];
  // code -> the form id it matched in this school's own folder (only for
  // "match" results). Drives duplicate detection after both passes.
  const matchedFormIdByCode = new Map<string, string>();

  await Promise.all(
    subtests.map(async (s) => {
      const url = urlByCode.get(s.code);
      if (!url) {
        results.push({ code: s.code, label: s.label, status: "no_link" });
        return;
      }
      try {
        const resolved = await resolveShortUrl(url);
        const candidates = extractFormIdCandidates(resolved);
        const matched = candidates.map((id) => ownIndex.get(id)).find(Boolean);
        if (matched) {
          results.push({
            code: s.code,
            label: s.label,
            status: "match",
            matchedTitle: matched.title,
          });
          matchedFormIdByCode.set(s.code, matched.canonicalId);
        } else if (candidates.length > 0) {
          pending.push({ code: s.code, label: s.label, candidates });
        } else {
          results.push({
            code: s.code,
            label: s.label,
            status: "not_found",
            message:
              "Link tidak mengarah ke Google Form — kemungkinan tiny.cc-nya belum dibuat atau rusak.",
          });
        }
      } catch {
        results.push({
          code: s.code,
          label: s.label,
          status: "error",
          message: "Gagal membuka link — cek koneksi atau link-nya rusak.",
        });
      }
    }),
  );

  // Second pass — only for links that didn't match this school's folder:
  // check whether they actually belong to some OTHER configured school's
  // folder instead, so the warning can name exactly which one (the
  // "connect ke form subtes yang sama tapi di folder sekolah lain" case)
  // rather than just a generic "not found".
  if (pending.length > 0) {
    const otherSchools = await prisma.school.findMany({
      where: { driveFormFolderId: { not: null }, id: { not: event.school.id } },
      select: { id: true, name: true, driveFormFolderId: true },
    });

    const otherIndexEntries = await Promise.all(
      otherSchools.map(async (s) => {
        try {
          const index = await withTimeout(
            buildFolderFormIndex(s.driveFormFolderId as string),
            FOLDER_BUILD_TIMEOUT_MS,
          );
          return { schoolName: s.name, index };
        } catch {
          return null; // best-effort — one unreadable/slow folder shouldn't block the whole check
        }
      }),
    );

    const crossSchoolMap = new Map<string, { schoolName: string; title: string }>();
    for (const entry of otherIndexEntries) {
      if (!entry) continue;
      for (const [formId, e] of entry.index) {
        if (!crossSchoolMap.has(formId)) {
          crossSchoolMap.set(formId, { schoolName: entry.schoolName, title: e.title });
        }
      }
    }

    for (const p of pending) {
      const foundElsewhere = p.candidates.map((id) => crossSchoolMap.get(id)).find(Boolean);
      if (foundElsewhere) {
        results.push({
          code: p.code,
          label: p.label,
          status: "wrong_school",
          matchedTitle: foundElsewhere.title,
          message: `Link ini mengarah ke form milik "${foundElsewhere.schoolName}" (judul: "${foundElsewhere.title}"), bukan sekolah ini.`,
        });
      } else {
        results.push({
          code: p.code,
          label: p.label,
          status: "not_found",
          message: "Link tidak mengarah ke form manapun di folder sekolah ini maupun sekolah lain.",
        });
      }
    }
  }

  const resultByCode = new Map(results.map((r) => [r.code, r]));

  // Duplicate detection — two subtests must never point at the same Google
  // Form. A form id matched by 2+ subtests is a copy-paste (e.g. ME's link
  // pasted from WU): flag every subtest sharing it, since which one is
  // authoritative can't be known here. This catches the "in the right
  // folder, so it looked green, but it's the wrong form" case that plain
  // folder-membership can't.
  const codesByFormId = new Map<string, string[]>();
  for (const [code, formId] of matchedFormIdByCode) {
    const arr = codesByFormId.get(formId);
    if (arr) arr.push(code);
    else codesByFormId.set(formId, [code]);
  }
  for (const codes of codesByFormId.values()) {
    if (codes.length < 2) continue;
    for (const code of codes) {
      const r = resultByCode.get(code);
      if (!r) continue;
      const others = codes.filter((c) => c !== code);
      r.status = "duplicate";
      r.message = `Link ini mengarah ke form yang sama dengan subtes ${others.join(
        ", ",
      )} — tiap subtes harus punya Google Form sendiri.`;
    }
  }

  // Title cross-contamination — a form still marked "match" whose title
  // names a DIFFERENT active subtest (its code as a whole token) while not
  // naming this one is very likely the wrong subtest's form. This only fires
  // on a positive other-code hit, so titles that simply don't carry a code
  // (e.g. SE -> "IST", GB -> "BIODATA GAYA BELAJAR") stay green instead of
  // false-alarming — matching the earlier decision that titles are too
  // inconsistent for positive auto-matching, only reliable for this kind of
  // clear mismatch.
  const activeCodes = subtests.map((s) => s.code);
  for (const s of subtests) {
    const r = resultByCode.get(s.code);
    if (!r || r.status !== "match" || !r.matchedTitle) continue;
    const titleTokens = tokenize(r.matchedTitle);
    const labelTokens = tokenize(s.label);
    const ownNamed = titleTokens.has(s.code) || [...labelTokens].every((t) => titleTokens.has(t));
    if (ownNamed) continue;
    const otherCode = activeCodes.find((c) => c !== s.code && titleTokens.has(c));
    if (otherCode) {
      r.status = "title_mismatch";
      r.message = `Judul form "${r.matchedTitle}" mengandung kode subtes ${otherCode}, bukan ${s.code} — kemungkinan link-nya tertukar.`;
    }
  }

  // Persist — every result with a saved link (i.e. not "no_link") updates
  // its SubtestLink row, so "Link Terisi" counts and Monitoring's warnings
  // reflect this check without re-running it.
  const checkedAt = new Date();
  await Promise.all(
    results
      .filter((r) => r.status !== "no_link")
      .map((r) => {
        const subtestTypeId = subtestTypeIdByCode.get(r.code);
        if (!subtestTypeId) return null;
        return prisma.subtestLink.update({
          where: { eventId_subtestTypeId: { eventId, subtestTypeId } },
          data: { checkStatus: r.status, checkMessage: r.message ?? null, checkedAt },
        });
      }),
  );

  revalidatePath("/jadwal");
  revalidatePath(`/jadwal/${eventId}`);
  revalidatePath(`/monitoring/${event.school.id}`);

  // Return in canonical subtest order (pass 1 ran concurrently, so results[] isn't ordered).
  return { results: subtests.map((s) => resultByCode.get(s.code)!) };
}
