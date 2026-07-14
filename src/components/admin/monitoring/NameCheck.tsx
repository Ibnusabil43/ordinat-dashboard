"use client";

import { useState, useTransition, type FormEvent } from "react";
import { Search, Check, X, AlertTriangle, RefreshCw, ChevronDown } from "lucide-react";
import { clsx } from "clsx";
import { searchName } from "@/server/actions/monitoring";
import type { NameSearchResult } from "@/lib/queries/monitoring";

/**
 * Search input + results list (FE-Q, v2 of FE-P3). Submit-triggered, not on
 * every keystroke — each search hits all live Sheets tabs, too expensive to
 * run on every character typed. No outer card/heading of its own — this
 * lives inside the "Cek Nama" tab on the school dashboard, which already
 * provides both.
 *
 * Kelas is a required field now (FE-Q1) — every search is scoped to a
 * specific kelas, there's no "search all kelas" mode. "Search Again" re-runs
 * the last submitted query+kelas against fresh Sheets data — separate from
 * the school dashboard's own "Refresh Data" button (RefreshDataButton),
 * which only covers the submission summary.
 *
 * Status-related copy in this component (labels, messages) is in English —
 * a confirmed, scoped exception to CLAUDE.md's Indonesian-UI rule for this
 * feature only, matching the earlier "Refresh Data"/"Search Again" decision.
 * Everything else (the intro line, the Cari button, form errors) stays
 * Indonesian, unchanged.
 */
export function NameCheck({ schoolId }: { schoolId: string }) {
  const [query, setQuery] = useState("");
  const [kelas, setKelas] = useState("");
  const [lastQuery, setLastQuery] = useState<string>();
  const [lastKelas, setLastKelas] = useState<string>();
  const [results, setResults] = useState<NameSearchResult[] | null>(null);
  const [error, setError] = useState<string>();
  const [pending, startTransition] = useTransition();

  const runSearch = (q: string, k: string) => {
    setError(undefined);
    startTransition(async () => {
      const res = await searchName(schoolId, q, k);
      if (res === null) {
        setResults(null);
        setError("Gagal mencari. Coba lagi.");
        return;
      }
      setResults(res);
      setLastQuery(q);
      setLastKelas(k);
    });
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    const trimmedQuery = query.trim();
    const trimmedKelas = kelas.trim();
    if (!trimmedQuery || !trimmedKelas) return;
    runSearch(trimmedQuery, trimmedKelas);
  };

  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-zinc-500">Cari nama siswa, lihat subtes mana saja yang sudah masuk.</p>

      <form onSubmit={handleSubmit} className="flex flex-col gap-2 sm:flex-row">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Nama siswa..."
          className="h-10 flex-1 rounded-lg border border-zinc-300 bg-white px-3 text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-zinc-900 focus:ring-1 focus:ring-zinc-900 focus:outline-none"
        />
        <input
          type="text"
          value={kelas}
          onChange={(e) => setKelas(e.target.value)}
          placeholder="Kelas (mis. XI IPA 2)"
          className="h-10 w-full rounded-lg border border-zinc-300 bg-white px-3 text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-zinc-900 focus:ring-1 focus:ring-zinc-900 focus:outline-none sm:w-40"
        />
        <button
          type="submit"
          disabled={pending || !query.trim() || !kelas.trim()}
          className="flex h-10 shrink-0 cursor-pointer items-center justify-center gap-2 rounded-lg bg-zinc-900 px-4 text-sm font-medium text-white transition hover:bg-zinc-700 disabled:cursor-not-allowed disabled:opacity-40"
        >
          <Search aria-hidden="true" size={16} />
          {pending ? "Mencari..." : "Cari"}
        </button>
      </form>

      {error && <p className="text-xs text-red-600">{error}</p>}

      {results && (
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between gap-2">
            <p className="text-xs text-zinc-500">
              Hasil untuk &ldquo;{lastQuery}&rdquo; &middot; Kelas {lastKelas}
            </p>
            <button
              type="button"
              onClick={() => lastQuery && lastKelas && runSearch(lastQuery, lastKelas)}
              disabled={pending}
              className={clsx(
                "flex shrink-0 items-center gap-1.5 text-xs font-medium transition",
                pending ? "cursor-not-allowed text-zinc-300" : "cursor-pointer text-zinc-600 hover:text-zinc-900",
              )}
            >
              <RefreshCw aria-hidden="true" size={12} className={clsx(pending && "animate-spin")} />
              {pending ? "Searching..." : "Search Again"}
            </button>
          </div>
          <div className="flex flex-col gap-1.5">
            {results.map((r) => (
              <ResultRow key={r.code} result={r} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * A confident `found`/`found_elsewhere` result only shows its top candidate
 * by default — but the backend still returns every candidate that cleared
 * MATCH_THRESHOLD (queries/monitoring.ts), not just the winner. This lets a
 * skeptical admin expand and eyeball the other possibilities too, instead of
 * blindly trusting a single green check.
 */
function ResultRow({ result }: { result: NameSearchResult }) {
  const [expanded, setExpanded] = useState(false);
  const otherMatches =
    result.status === "found" || result.status === "found_elsewhere" ? result.matches.slice(1) : [];

  return (
    <div className="rounded-lg bg-zinc-50 px-3 py-2 text-sm">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <span className="text-zinc-900">{result.label}</span>
          <ResultDetail result={result} />
        </div>
        <StatusIcon status={result.status} />
      </div>
      {otherMatches.length > 0 && (
        <>
          <button
            type="button"
            onClick={() => setExpanded((e) => !e)}
            className="mt-1 flex cursor-pointer items-center gap-1 text-xs font-medium text-zinc-500 transition hover:text-zinc-900"
          >
            <ChevronDown
              aria-hidden="true"
              size={12}
              className={clsx("transition-transform", expanded && "rotate-180")}
            />
            {expanded
              ? "Hide other possibilities"
              : `Show ${otherMatches.length} other possibilit${otherMatches.length === 1 ? "y" : "ies"}`}
          </button>
          {expanded && (
            <ul className="mt-1 flex flex-col gap-0.5 border-t border-zinc-200 pt-1 text-xs">
              {otherMatches.map((m, i) => (
                <li key={i} className="text-zinc-500">
                  {m.name}
                  {m.kelas && <span> &middot; {m.kelas}</span>}
                  <span className="text-zinc-400"> &mdash; Possible match</span>
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </div>
  );
}

function StatusIcon({ status }: { status: NameSearchResult["status"] }) {
  if (status === "found") {
    return (
      <span
        className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-green-600 text-white"
        aria-label="Match"
      >
        <Check aria-hidden="true" size={14} />
      </span>
    );
  }
  if (status === "found_elsewhere" || status === "ambiguous") {
    return (
      <span
        className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-amber-100 text-amber-600"
        aria-label={status === "ambiguous" ? "Multiple possible matches" : "Found in a different kelas"}
      >
        <AlertTriangle aria-hidden="true" size={14} />
      </span>
    );
  }
  return (
    <span
      className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-zinc-100 text-zinc-400"
      aria-label="Not found"
    >
      <X aria-hidden="true" size={14} />
    </span>
  );
}

function ResultDetail({ result }: { result: NameSearchResult }) {
  if (result.status === "found") {
    const m = result.matches[0];
    return (
      <p className="mt-0.5 truncate text-xs text-zinc-500">
        {m.name}
        {m.kelas && <span> &middot; {m.kelas}</span>}
        <span className="text-green-700"> &mdash; Match</span>
      </p>
    );
  }
  if (result.status === "found_elsewhere") {
    const m = result.matches[0];
    return (
      <p className="mt-0.5 text-xs text-amber-700">
        Not found in this kelas &mdash; possible match in {m.kelas ?? "an unknown kelas"}: {m.name}
      </p>
    );
  }
  if (result.status === "ambiguous") {
    return (
      <ul className="mt-0.5 flex flex-col gap-0.5 text-xs">
        {result.matches.map((m, i) => (
          <li key={i} className="text-amber-700">
            {m.name}
            {m.kelas && <span className="text-zinc-500"> &middot; {m.kelas}</span>}
            <span className="text-zinc-400"> &mdash; Possible match</span>
          </li>
        ))}
      </ul>
    );
  }
  return null;
}
