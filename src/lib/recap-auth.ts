/**
 * Bearer-token auth for the internal Flask ↔ dashboard webhook(s).
 * This is NOT admin-session auth — the Flask tool has no session, it
 * authenticates with the shared RECAP_SERVICE_TOKEN. See CLAUDE.md > Integration.
 */
import { safeEqual } from "@/lib/token-auth";

/**
 * True only if the request carries `Authorization: Bearer <RECAP_SERVICE_TOKEN>`.
 * Fails closed when the token is unconfigured or still the .env.example
 * placeholder — an unset secret must never authorize anything.
 */
export function isValidRecapToken(request: Request): boolean {
  const token = process.env.RECAP_SERVICE_TOKEN;
  if (!token || token === "ganti-dengan-token-acak-panjang") return false;

  const header = request.headers.get("authorization");
  if (!header?.startsWith("Bearer ")) return false;

  return safeEqual(header.slice("Bearer ".length), token);
}
