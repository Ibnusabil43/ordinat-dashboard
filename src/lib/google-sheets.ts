/**
 * Google Sheets/Drive client (BE-L2, PRD FR-15). Two unrelated jobs share
 * this one file, but — revised, Phase 15 — they now use two DIFFERENT auth
 * mechanisms, not one shared service account:
 *  - listSheetTabs/readTabRows read a school's raw-data spreadsheet
 *    (School.driveRawSheetId) — one spreadsheet, 12 internal tabs. Still the
 *    service account (GOOGLE_SERVICE_ACCOUNT_EMAIL/_PRIVATE_KEY) — reading
 *    only, no storage quota needed, works fine.
 *  - uploadOrUpdateFile writes a recap result into the one shared results
 *    folder (GOOGLE_DRIVE_RESULTS_FOLDER_ID, Phase 15) — NOT a per-school
 *    folder. This is OAuth (GOOGLE_OAUTH_CLIENT_ID/_SECRET/_REFRESH_TOKEN),
 *    not the service account: a bare service account has no Drive storage
 *    quota of its own and cannot CREATE new files in a personal "My Drive"
 *    folder (only inside a Shared Drive, which needs paid Workspace) — it
 *    can read shared content fine, just not write new files. So writes
 *    authenticate as the folder's actual owner via OAuth instead. See
 *    scripts/google-oauth-setup.mjs for the one-time authorization runbook.
 */
import { Readable } from "node:stream";
import { google } from "googleapis";
import { SUBTEST_TYPES } from "@/lib/constants";

const SHEETS_READONLY_SCOPE = "https://www.googleapis.com/auth/spreadsheets.readonly";

function getServiceAccountAuth() {
  const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  const rawKey = process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY;
  if (!email || !rawKey) {
    throw new Error(
      "GOOGLE_SERVICE_ACCOUNT_EMAIL / GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY belum diatur di .env.",
    );
  }
  // .env stores the PEM with literal \n sequences (single-line env var) — unescape before use.
  return new google.auth.JWT({
    email,
    key: rawKey.replace(/\\n/g, "\n"),
    scopes: [SHEETS_READONLY_SCOPE],
  });
}

function getOAuthAuth() {
  const clientId = process.env.GOOGLE_OAUTH_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_OAUTH_CLIENT_SECRET;
  const refreshToken = process.env.GOOGLE_OAUTH_REFRESH_TOKEN;
  if (!clientId || !clientSecret || !refreshToken) {
    throw new Error(
      "GOOGLE_OAUTH_CLIENT_ID / GOOGLE_OAUTH_CLIENT_SECRET / GOOGLE_OAUTH_REFRESH_TOKEN belum diatur di .env — jalankan scripts/google-oauth-setup.mjs.",
    );
  }
  const client = new google.auth.OAuth2(clientId, clientSecret);
  client.setCredentials({ refresh_token: refreshToken });
  return client;
}

function sheetsClient() {
  return google.sheets({ version: "v4", auth: getServiceAccountAuth() });
}

function driveClient() {
  return google.drive({ version: "v3", auth: getOAuthAuth() });
}

/** Uppercase, non-alphanumeric run collapsed to a single break — "1. BIODATA & SE" -> ["1","BIODATA","SE"]. */
function tokenize(s: string): string[] {
  return s
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, " ")
    .trim()
    .split(/\s+/)
    .filter(Boolean);
}

/**
 * Whole-token match, not substring — a raw tab named "1. BIODATA & SE"
 * matches subtest "SE" via its "SE" token; it must NOT match e.g. a
 * hypothetical code that happens to be a substring of "BIODATA". Handles
 * multi-word labels ("Gaya Belajar") as a contiguous run of tokens, and
 * "Holland Test (RIASEC)"-style parenthetical codes via the same tokenizer.
 */
function matchesSubtest(tabTokens: string[], subtest: { code: string; label: string }): boolean {
  if (tabTokens.includes(subtest.code.toUpperCase())) return true;
  const labelTokens = tokenize(subtest.label);
  if (labelTokens.length > 1) {
    for (let i = 0; i <= tabTokens.length - labelTokens.length; i++) {
      if (labelTokens.every((t, j) => tabTokens[i + j] === t)) return true;
    }
  }
  return false;
}

export interface SheetTabMatch {
  code: string;
  label: string;
  /** Actual tab name found in the spreadsheet, or null if this subtest has no matching tab. */
  tabName: string | null;
}

/**
 * Lists a raw spreadsheet's internal tabs and resolves each of the 12
 * canonical subtests to whichever tab matches it, if any — real-world tab
 * names are inconsistent (numbered prefixes, combined labels, parenthetical
 * codes), so this never assumes exact string equality with `SUBTEST_TYPES`.
 */
export async function listSheetTabs(spreadsheetId: string): Promise<SheetTabMatch[]> {
  const sheets = sheetsClient();
  const res = await sheets.spreadsheets.get({
    spreadsheetId,
    fields: "sheets.properties.title",
  });
  const tabNames = (res.data.sheets ?? [])
    .map((s) => s.properties?.title)
    .filter((t): t is string => Boolean(t));

  return SUBTEST_TYPES.map((subtest) => ({
    code: subtest.code,
    label: subtest.label,
    tabName: tabNames.find((tabName) => matchesSubtest(tokenize(tabName), subtest)) ?? null,
  }));
}

/** Every row of one tab (including the header row) — callers slice/skip as needed. */
export async function readTabRows(spreadsheetId: string, tabName: string): Promise<string[][]> {
  const sheets = sheetsClient();
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId,
    // Sheet names can contain spaces/punctuation — always quote, escaping embedded quotes.
    range: `'${tabName.replace(/'/g, "''")}'`,
  });
  return (res.data.values ?? []) as string[][];
}

/**
 * Creates a file in `folderId`, or — if `existingFileId` is given — updates
 * that file's content in place (same file ID, so a shared link keeps
 * working across re-runs). `folderId` is always the one shared results
 * folder (GOOGLE_DRIVE_RESULTS_FOLDER_ID) in practice, never per-school.
 */
export async function uploadOrUpdateFile(
  folderId: string,
  filename: string,
  content: Buffer,
  existingFileId?: string | null,
): Promise<string> {
  const drive = driveClient();
  const media = {
    mimeType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    body: Readable.from(content),
  };

  if (existingFileId) {
    // requestBody.name too, not just media — otherwise a re-run under a
    // changed naming scheme (or corrected school name) silently keeps
    // whatever name the file got on its first upload.
    const res = await drive.files.update({
      fileId: existingFileId,
      requestBody: { name: filename },
      media,
      fields: "id",
    });
    if (!res.data.id) throw new Error("Drive tidak mengembalikan file ID setelah update.");
    return res.data.id;
  }

  const res = await drive.files.create({
    requestBody: { name: filename, parents: [folderId] },
    media,
    fields: "id",
  });
  if (!res.data.id) throw new Error("Drive tidak mengembalikan file ID setelah upload.");
  return res.data.id;
}
