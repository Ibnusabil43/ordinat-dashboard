"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Play } from "lucide-react";
import { advanceToOngoing } from "@/server/actions/events";

/**
 * "Mulai Psikotes" — moves a SCHEDULED event to ONGOING. Forward, not
 * destructive, so no confirmation modal (DESIGN.md §9 reserves those for
 * destructive/final actions). The button is only rendered while SCHEDULED.
 */
export function StartPsikotesButton({ id }: { id: string }) {
  const router = useRouter();
  const [error, setError] = useState<string>();
  const [pending, startTransition] = useTransition();

  const start = () => {
    setError(undefined);
    startTransition(async () => {
      const res = await advanceToOngoing(id);
      if (res?.error) {
        setError(res.error);
        return;
      }
      router.refresh();
    });
  };

  return (
    <div className="flex flex-col gap-1">
      <button
        type="button"
        onClick={start}
        disabled={pending}
        className="flex h-10 cursor-pointer items-center justify-center gap-2 rounded-lg bg-zinc-900 px-4 text-sm font-medium text-white transition hover:bg-zinc-700 disabled:cursor-not-allowed disabled:opacity-40"
      >
        <Play aria-hidden="true" size={16} />
        {pending ? "Memproses..." : "Mulai Psikotes"}
      </button>
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  );
}
