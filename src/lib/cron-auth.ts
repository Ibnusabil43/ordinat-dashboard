/**
 * Bearer-token auth for Vercel Cron (BE-I3). Vercel signs its own cron
 * requests with `Authorization: Bearer <CRON_SECRET>` automatically once
 * that env var is set — no header wiring needed on Vercel's side, just this
 * check on ours. Same fail-closed pattern as isValidRecapToken (see
 * recap-auth.ts), sharing the same constant-time compare (token-auth.ts)
 * rather than a second copy of it.
 */
import { safeEqual } from "@/lib/token-auth";

/**
 * True only if the request carries `Authorization: Bearer <CRON_SECRET>`.
 * Fails closed when the secret is unconfigured or still the .env.example
 * placeholder — an unset secret must never authorize anything.
 */
export function isValidCronRequest(request: Request): boolean {
  const token = process.env.CRON_SECRET;
  if (!token || token === "ganti-dengan-token-acak-panjang") return false;

  const header = request.headers.get("authorization");
  if (!header?.startsWith("Bearer ")) return false;

  return safeEqual(header.slice("Bearer ".length), token);
}
