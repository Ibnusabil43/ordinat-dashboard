"use client";

import { useState, useTransition } from "react";
import { CheckCircle2, AlertTriangle, MinusCircle, Search } from "lucide-react";
import { checkSubtestLinks, type LinkCheckResult } from "@/server/actions/link-check";

const STATUS_STYLE: Record<LinkCheckResult["status"], string> = {
  match: "border-emerald-200 bg-emerald-50 text-emerald-700",
  not_found: "border-amber-200 bg-amber-50 text-amber-700",
  wrong_school: "border-red-200 bg-red-50 text-red-700",
  duplicate: "border-red-200 bg-red-50 text-red-700",
  title_mismatch: "border-amber-200 bg-amber-50 text-amber-700",
  error: "border-amber-200 bg-amber-50 text-amber-700",
  no_link: "border-zinc-200 bg-zinc-50 text-zinc-500",
};

function StatusIcon({ status }: { status: LinkCheckResult["status"] }) {
  if (status === "match") return <CheckCircle2 aria-hidden="true" size={16} className="shrink-0" />;
  if (status === "no_link") return <MinusCircle aria-hidden="true" size={16} className="shrink-0" />;
  return <AlertTriangle aria-hidden="true" size={16} className="shrink-0" />;
}

/**
 * "Cek Link" — on-demand check that each active subtest's saved tiny.cc
 * link resolves to a Google Form inside the school's Drive form folder (see
 * server/actions/link-check.ts). Deliberately manual, not automatic on
 * page load — every check costs a handful of network calls (tiny.cc + Drive
 * + Forms API).
 */
export function CheckLinksPanel({ eventId }: { eventId: string }) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [results, setResults] = useState<LinkCheckResult[] | null>(null);

  const handleCheck = () => {
    setError(null);
    startTransition(async () => {
      const state = await checkSubtestLinks(eventId);
      if (state.error) {
        setError(state.error);
        setResults(null);
      } else {
        setResults(state.results ?? []);
      }
    });
  };

  return (
    <div className="rounded-2xl border border-zinc-200 bg-white p-4 sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold text-zinc-900">Cek Link</h2>
          <p className="mt-0.5 text-xs text-zinc-500">
            Pastikan tiap link tiny.cc beneran ngarah ke Google Form sekolah ini, bukan sekolah lain.
          </p>
        </div>
        <button
          type="button"
          onClick={handleCheck}
          disabled={isPending}
          className="flex h-9 shrink-0 cursor-pointer items-center justify-center gap-2 rounded-lg border border-zinc-300 bg-white px-3 text-sm font-medium text-zinc-900 transition hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-40"
        >
          <Search aria-hidden="true" size={14} />
          {isPending ? "Mengecek..." : "Cek Link"}
        </button>
      </div>

      {error && <p className="mt-3 text-xs text-red-600">{error}</p>}

      {results && (
        <div className="mt-4 flex flex-col gap-2">
          {results.map((r) => (
            <div
              key={r.code}
              className={`flex items-start gap-2 rounded-lg border px-3 py-2 text-xs ${STATUS_STYLE[r.status]}`}
            >
              <StatusIcon status={r.status} />
              <div className="min-w-0">
                <span className="font-medium">{r.label}</span>
                {r.status === "match" && r.matchedTitle && (
                  <span> — judul form: &ldquo;{r.matchedTitle}&rdquo;</span>
                )}
                {r.status === "no_link" && <span> — belum ada link tersimpan</span>}
                {r.message && <span> — {r.message}</span>}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
