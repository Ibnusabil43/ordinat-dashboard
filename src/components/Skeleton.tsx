import { clsx } from "clsx";

/**
 * Placeholder block shown while a route's server component resolves. Rendered
 * by `loading.tsx` files so navigation paints instantly instead of blocking on
 * the server (auth + DB round-trips) with a frozen screen.
 */
export function Skeleton({ className }: { className?: string }) {
  return <div className={clsx("animate-pulse rounded-md bg-zinc-200", className)} />;
}
