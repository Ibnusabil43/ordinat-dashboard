/**
 * One-time authorization script for GOOGLE_OAUTH_REFRESH_TOKEN (Phase 15
 * runbook). Run once (or again if the token is ever revoked): starts a
 * local server, prints a Google consent URL for you to open in YOUR OWN
 * browser and log in with the personal account that owns the Drive results
 * folder, then captures the redirect and prints a refresh token to paste
 * into .env as GOOGLE_OAUTH_REFRESH_TOKEN.
 *
 * Requires GOOGLE_OAUTH_CLIENT_ID / GOOGLE_OAUTH_CLIENT_SECRET already in
 * .env (from a "Desktop app" OAuth client in GCP Console).
 *
 * Usage: node --env-file=.env scripts/google-oauth-setup.mjs
 */
import http from "node:http";
import { google } from "googleapis";

const CLIENT_ID = process.env.GOOGLE_OAUTH_CLIENT_ID;
const CLIENT_SECRET = process.env.GOOGLE_OAUTH_CLIENT_SECRET;
const PORT = 8721;
const REDIRECT_URI = `http://localhost:${PORT}`;

if (!CLIENT_ID || !CLIENT_SECRET) {
  console.error("GOOGLE_OAUTH_CLIENT_ID / GOOGLE_OAUTH_CLIENT_SECRET belum diatur di .env.");
  process.exit(1);
}

const oauth2Client = new google.auth.OAuth2(CLIENT_ID, CLIENT_SECRET, REDIRECT_URI);

const authUrl = oauth2Client.generateAuthUrl({
  access_type: "offline",
  prompt: "consent", // force a refresh_token even on re-authorization
  scope: ["https://www.googleapis.com/auth/drive"],
});

console.log("\n=== Buka URL ini di browser kamu sendiri, login dengan akun Google pribadi ===\n");
console.log(authUrl);
console.log("\nMenunggu callback di", REDIRECT_URI, "...\n");

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, REDIRECT_URI);
  const code = url.searchParams.get("code");
  const error = url.searchParams.get("error");

  if (error) {
    res.writeHead(400, { "Content-Type": "text/html" });
    res.end(`<html><body>Authorization ditolak: ${error}</body></html>`);
    console.error("AUTHORIZATION_DENIED:", error);
    server.close();
    process.exit(1);
  }

  if (!code) {
    res.writeHead(400);
    res.end("No code received.");
    return;
  }

  res.writeHead(200, { "Content-Type": "text/html" });
  res.end("<html><body>Authorization selesai — tab ini boleh ditutup.</body></html>");

  try {
    const { tokens } = await oauth2Client.getToken(code);
    console.log("\n=== SUKSES ===");
    console.log("Refresh token (salin ke .env GOOGLE_OAUTH_REFRESH_TOKEN):\n");
    console.log(tokens.refresh_token);
    console.log();
  } catch (e) {
    console.error("TOKEN_EXCHANGE_FAILED:", e.message);
    process.exitCode = 1;
  } finally {
    server.close();
    process.exit();
  }
});

server.listen(PORT);

setTimeout(() => {
  console.error("TIMEOUT: tidak ada callback dalam 5 menit.");
  process.exit(1);
}, 5 * 60 * 1000);
