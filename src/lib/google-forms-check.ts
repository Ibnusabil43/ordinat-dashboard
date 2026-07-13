/**
 * Link integrity check — verifies each subtest's tiny.cc link actually
 * resolves to a Google Form that lives in the correct school's Drive folder
 * (School.driveFormFolderId), catching links pasted for the wrong school or
 * pointing at something stale/broken. Manual, on-demand only ("Cek Link"
 * button) — every check here is a network call (tiny.cc + Drive + Forms
 * API), so it never runs on a normal page load.
 *
 * Two ID spaces don't line up, which is why this needs the Forms API and
 * not just Drive: a form's Drive file ID (what `files.list` returns) is NOT
 * the same ID that appears in its public share URL
 * ("docs.google.com/forms/d/e/<published-id>/viewform", what a tiny.cc link
 * actually points to). The Forms API's `responderUri` is the only bridge
 * between the two.
 *
 * Infra prerequisites (one-time, outside this code):
 *  1. Enable the "Google Forms API" in the same GCP project as Sheets/Drive.
 *  2. Share each school's Drive form folder with GOOGLE_SERVICE_ACCOUNT_EMAIL
 *     (Viewer) — same as the RAW sheet already must be shared, and folder
 *     sharing cascades to the forms inside it.
 */
import { google } from "googleapis";
import { getServiceAccountAuth } from "@/lib/google-sheets";

// Per-request network timeout. Without these, one stalled call (a slow
// tiny.cc redirect, a hung Google auth-token fetch) leaves the whole "Cek
// Link" Promise.all pending forever — the "Mengecek..." button never
// resolves. Every outbound call below is bounded so the check always
// finishes; a timed-out call surfaces as an error/not-found row, not a hang.
const SHORT_URL_TIMEOUT_MS = 8000;
const GOOGLE_API_TIMEOUT_MS = 15000;

function driveMetadataClient() {
  return google.drive({ version: "v3", auth: getServiceAccountAuth() });
}

function formsClient() {
  return google.forms({ version: "v1", auth: getServiceAccountAuth() });
}

export interface DriveFormFile {
  id: string;
  name: string;
}

/**
 * Lists native Google Forms living directly inside `folderId` — non-recursive,
 * a school's forms all live flat in one folder, no subfolders expected.
 */
export async function listFormsInFolder(folderId: string): Promise<DriveFormFile[]> {
  const drive = driveMetadataClient();
  const res = await drive.files.list(
    {
      q: `'${folderId}' in parents and mimeType='application/vnd.google-apps.form' and trashed=false`,
      fields: "files(id,name)",
      pageSize: 100,
    },
    { timeout: GOOGLE_API_TIMEOUT_MS },
  );
  return (res.data.files ?? []).filter(
    (f): f is { id: string; name: string } => Boolean(f.id && f.name),
  );
}

export interface FormInfo {
  title: string;
  responderUri: string;
}

/**
 * Reads a form's public responder URL + title via the Forms API — the
 * bridge between a Drive file ID and the public URL a tiny.cc link resolves
 * to (see module doc). Returns null if the form has no responder URL yet
 * (shouldn't happen for a form actually in use).
 */
export async function getFormResponderUri(formId: string): Promise<FormInfo | null> {
  const forms = formsClient();
  const res = await forms.forms.get({ formId }, { timeout: GOOGLE_API_TIMEOUT_MS });
  const responderUri = res.data.responderUri;
  if (!responderUri) return null;
  const rawTitle = res.data.info?.title || res.data.info?.documentTitle || "";
  const title = rawTitle.trim() || "(tanpa judul)";
  return { title, responderUri };
}

// All Google Forms URL shapes optionally carry an authuser prefix
// "/forms/u/<n>/d/..." (Google inserts it when you're signed into more than
// one account). Both the published ("/d/e/<id>") and file-ID ("/d/<id>")
// forms can appear with or without it — this fragment matches "/forms" then
// an optional "/u/<n>", shared by every extractor below so none of them
// falsely read a "/u/1/d/..." link as "not a form".
const FORMS_PREFIX = String.raw`\/forms(?:\/u\/\d+)?`;

/**
 * Extracts the published form ID from a form's `responderUri`
 * ("/forms/d/e/<published-id>/viewform", possibly with a "/u/<n>/" prefix).
 * This is the ID stable across query params and which page a share link
 * points to.
 */
export function extractPublishedFormId(url: string): string | null {
  const match = url.match(new RegExp(`${FORMS_PREFIX}\\/d\\/e\\/([a-zA-Z0-9_-]+)`));
  return match ? match[1] : null;
}

/**
 * Extracts every form identifier a resolved URL might carry, so a link
 * matches whichever shape it was created in:
 *  - "/forms/d/e/<published-id>/viewform" — the canonical published/share URL
 *  - "/forms/d/<file-id>/viewform" (or /edit) — the file-ID URL you get from
 *    the browser bar or a preview link; <file-id> is the Drive file ID,
 *    which is exactly what Drive's files.list returns (see
 *    buildFolderFormIndex). Recognizing this is why a real link created the
 *    "wrong" way still checks correctly instead of falsely reading as broken.
 * Either shape may carry a "/forms/u/<n>/" authuser prefix (see FORMS_PREFIX).
 * Returns [] when the URL is not a Google Form at all (dead/short-link stub).
 */
export function extractFormIdCandidates(url: string): string[] {
  const ids: string[] = [];
  const published = url.match(new RegExp(`${FORMS_PREFIX}\\/d\\/e\\/([a-zA-Z0-9_-]+)`));
  if (published) ids.push(published[1]);
  const byFileId = url.match(new RegExp(`${FORMS_PREFIX}\\/d\\/(?!e\\/)([a-zA-Z0-9_-]+)`));
  if (byFileId) ids.push(byFileId[1]);
  return ids;
}

/**
 * Follows a short link (tiny.cc etc.) to its final destination URL. Uses
 * GET rather than HEAD — some redirect services reject HEAD — and cancels
 * the response body immediately since only the final `res.url` is needed,
 * not the destination page's content.
 *
 * Bounded by SHORT_URL_TIMEOUT_MS via AbortSignal: a tiny.cc link that
 * stalls (dead link, throttled, slow redirect) would otherwise hang the
 * whole "Cek Link" run. On timeout the fetch aborts and throws, so the
 * caller records that one link as an error rather than the button spinning
 * forever.
 */
export async function resolveShortUrl(url: string): Promise<string> {
  const res = await fetch(url, {
    method: "GET",
    redirect: "follow",
    signal: AbortSignal.timeout(SHORT_URL_TIMEOUT_MS),
  });
  await res.body?.cancel().catch(() => {});
  return res.url;
}

export interface FolderFormEntry {
  title: string;
  /**
   * The Drive file ID — the ONE stable identity of a form. Both the file-ID
   * key and the published-ID key of the same form point at an entry carrying
   * this, so callers can dedupe two links that reference the same form via
   * different URL shapes ("/d/e/<published>" vs "/d/<file>").
   */
  canonicalId: string;
}

/**
 * Builds a folder's form index — maps every identifier a link might carry
 * (both the Drive file-ID and the published-ID) to that form's entry
 * ({title, canonicalId}). Shared by both "does this link belong to THIS
 * school's folder" and "does it actually belong to some OTHER school's
 * folder instead" (link-check.ts).
 *
 * Indexing the file-ID from Drive alone (no Forms API call needed) means a
 * "/forms/d/<file-id>" link still matches even if the Forms API is disabled
 * or a form has no responderUri; the Forms API just adds the published-ID
 * and the real title on top. So one unreadable form degrades gracefully to
 * a file-ID + Drive-filename entry rather than dropping out entirely.
 */
export async function buildFolderFormIndex(
  folderId: string,
): Promise<Map<string, FolderFormEntry>> {
  const files = await listFormsInFolder(folderId);
  const map = new Map<string, FolderFormEntry>();
  await Promise.all(
    files.map(async (f) => {
      let title = f.name;
      let publishedId: string | null = null;
      try {
        const info = await getFormResponderUri(f.id);
        if (info) {
          title = info.title;
          publishedId = extractPublishedFormId(info.responderUri);
        }
      } catch {
        // Forms API unavailable for this form — fall back to Drive metadata only.
      }
      const entry: FolderFormEntry = { title, canonicalId: f.id };
      map.set(f.id, entry);
      if (publishedId) map.set(publishedId, entry);
    }),
  );
  return map;
}
