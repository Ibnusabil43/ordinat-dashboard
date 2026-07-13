/**
 * Extracts a Google Drive/Sheets/Forms resource ID from either a bare ID or
 * a pasted share URL — so admins can paste whatever they actually copied (a
 * full link) instead of hunting for the ID substring themselves. Recognizes
 * the "/d/<id>" shape (Sheets/Docs/Forms edit links) and the
 * "/folders/<id>" shape (Drive folders), plus the older "?id=<id>"
 * query-param share links. Falls back to the trimmed input unchanged if
 * none match, so a bare ID (the previously required input) still works
 * exactly as before.
 */
export function extractDriveResourceId(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed) return trimmed;
  const pathMatch = trimmed.match(/\/(?:d|folders)\/([a-zA-Z0-9_-]{10,})/);
  if (pathMatch) return pathMatch[1];
  const queryMatch = trimmed.match(/[?&]id=([a-zA-Z0-9_-]{10,})/);
  if (queryMatch) return queryMatch[1];
  return trimmed;
}
