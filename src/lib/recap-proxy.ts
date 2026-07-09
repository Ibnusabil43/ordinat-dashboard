/**
 * Shared config for proxying admin requests to the Automated Recap Flask
 * service. Every route under src/app/api/admin/recap/* checks the admin
 * session itself first (this file has no auth logic), then uses these to
 * reach Flask. See CLAUDE.md > Integration contract with Flask.
 */

export function recapToolUrl(path: string): string {
  const base = process.env.RECAP_TOOL_URL;
  if (!base) throw new Error("RECAP_TOOL_URL belum dikonfigurasi.");
  return `${base}${path}`;
}

export function recapAuthHeader(): HeadersInit {
  const token = process.env.RECAP_SERVICE_TOKEN;
  if (!token) throw new Error("RECAP_SERVICE_TOKEN belum dikonfigurasi.");
  return { Authorization: `Bearer ${token}` };
}
