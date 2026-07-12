"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { suggestTinyUrl } from "@/lib/constants";
import type { SubtestType } from "@/lib/constants";
import type { LinksActionState } from "@/server/actions/links";

type Action = (
  prevState: LinksActionState | undefined,
  formData: FormData,
) => Promise<LinksActionState>;

function SaveBar() {
  const { pending } = useFormStatus();
  return (
    <div className="sticky bottom-0 -mx-4 border-t border-zinc-200 bg-white/95 p-4 backdrop-blur sm:static sm:mx-0 sm:border-0 sm:bg-transparent sm:p-0 sm:backdrop-blur-none">
      <button
        type="submit"
        disabled={pending}
        className="flex h-10 w-full cursor-pointer items-center justify-center rounded-lg bg-zinc-900 px-4 text-sm font-medium text-white transition hover:bg-zinc-700 disabled:cursor-not-allowed disabled:opacity-40 sm:w-auto"
      >
        {pending ? "Menyimpan..." : "Simpan Link"}
      </button>
    </div>
  );
}

/**
 * 12-field subtest URL form (FE-H1). Empty fields prefill with the tiny.cc
 * suggestion so the admin can accept-as-is or override. 2 columns desktop,
 * 1 mobile; save bar sticks to the bottom on mobile so it's always reachable.
 */
export function LinkForm({
  action,
  slug,
  existing,
  subtests,
}: {
  action: Action;
  slug: string;
  /** code -> saved url, only for subtests that already have one. */
  existing: Record<string, string>;
  /** The event's active subtests (defaults to all 12 via resolveActiveSubtests). */
  subtests: readonly SubtestType[];
}) {
  const [state, formAction] = useActionState(action, undefined);

  return (
    <form action={formAction} className="flex flex-col gap-6 pb-4 sm:pb-0">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {subtests.map((s) => {
          const fieldError = state?.fieldErrors?.[s.code];
          const suggestion = suggestTinyUrl(slug, s.code);
          return (
            <div key={s.code}>
              <label htmlFor={`url_${s.code}`} className="mb-1.5 block text-sm font-medium text-zinc-900">
                {s.code}
                {s.label !== s.code && <span className="font-normal text-zinc-500"> — {s.label}</span>}
              </label>
              <input
                id={`url_${s.code}`}
                name={`url_${s.code}`}
                type="text"
                defaultValue={existing[s.code] ?? suggestion}
                placeholder={suggestion}
                className={`h-10 w-full rounded-lg border bg-white px-3 font-mono text-xs text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:ring-1 ${
                  fieldError
                    ? "border-red-500 focus:border-red-500 focus:ring-red-500"
                    : "border-zinc-300 focus:border-zinc-900 focus:ring-zinc-900"
                }`}
              />
              {fieldError && <p className="mt-1 text-xs text-red-600">{fieldError}</p>}
            </div>
          );
        })}
      </div>

      {state?.success && <p className="text-sm text-zinc-500">Tersimpan.</p>}
      {state?.error && <p className="text-xs text-red-600">{state.error}</p>}

      <SaveBar />
    </form>
  );
}
