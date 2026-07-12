"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { RefreshCw } from "lucide-react";
import { clsx } from "clsx";

/**
 * Re-fetches this page's server data (the Sheets-backed submission summary,
 * in practice — everything else on the page is a cheap DB read anyway) via
 * router.refresh(). No full browser reload, so NameCheck's own client state
 * (its separate "Cari Ulang" refresh) is untouched.
 */
export function RefreshDataButton() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  return (
    <button
      type="button"
      onClick={() => startTransition(() => router.refresh())}
      disabled={pending}
      className={clsx(
        "flex h-9 shrink-0 items-center justify-center gap-2 rounded-lg border px-3 text-sm font-medium transition",
        pending
          ? "cursor-not-allowed border-zinc-200 bg-zinc-50 text-zinc-400"
          : "cursor-pointer border-zinc-300 bg-white text-zinc-900 hover:bg-zinc-50",
      )}
    >
      <RefreshCw aria-hidden="true" size={14} className={clsx(pending && "animate-spin")} />
      {pending ? "Refreshing..." : "Refresh Data"}
    </button>
  );
}
