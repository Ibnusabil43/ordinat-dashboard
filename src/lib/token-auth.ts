/**
 * Constant-time string compare (equal-length only; length is not secret
 * here) — shared by every bearer-token check in the app (RECAP_SERVICE_TOKEN
 * in recap-auth.ts, CRON_SECRET in cron-auth.ts) so there's exactly one
 * implementation to get right, not one per secret.
 */
export function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let mismatch = 0;
  for (let i = 0; i < a.length; i++) mismatch |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return mismatch === 0;
}
