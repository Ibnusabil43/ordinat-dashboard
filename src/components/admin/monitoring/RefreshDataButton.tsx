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
      className="flex h-9 shrink-0 cursor-pointer items-center justify-center gap-2 rounded-lg border border-zinc-300 bg-white px-3 text-sm font-medium text-zinc-900 transition hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-40"
    >
      <RefreshCw aria-hidden="true" size={14} className={clsx(pending && "animate-spin")} />
      Refresh Data
    </button>
  );
}
