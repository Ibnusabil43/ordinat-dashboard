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
 * specific kelas, there's no "search all kelas" mode. Fixed dropdown, not
 * free text — "KELAS X 1".."KELAS X {kelasCount}", matching the naming
 * convention real RAW sheets actually use (confirmed against live data), so
 * there's no typo/format mismatch between what's typed here and what's in
 * the sheet's KELAS column. `kelasCount` comes from the school's real Kelas
 * row count (the Classes menu), not a hardcoded number.
 * "Search Again" re-runs the last submitted query+kelas against fresh Sheets
 * data — separate from the school dashboard's own "Refresh Data" button
 * (RefreshDataButton), which only covers the submission summary.
 *
 * Status-related copy in this component (labels, messages) was English from
 * the start — a confirmed, scoped exception to CLAUDE.md's original
 * Indonesian-UI rule, matching the earlier "Refresh Data"/"Search Again"
 * decision. The rest of the component's copy (intro line, Search button,
 * form errors) has since been translated too, as part of the full
 * English-everywhere sweep — no longer a special case.
 */
export function NameCheck({ schoolId, kelasCount }: { schoolId: string; kelasCount: number }) {
  const [query, setQuery] = useState("");
  const [kelas, setKelas] = useState("");
  const kelasOptions = Array.from({ length: kelasCount }, (_, i) => `KELAS X ${i + 1}`);
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
        setError("Search failed. Try again.");
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
      <p className="text-sm text-zinc-500">
        Search for a student&rsquo;s name to see which subtests they&rsquo;ve submitted.
      </p>

      {kelasCount === 0 ? (
        <p className="text-xs text-amber-700">
          No classes set up for this school yet — add some in Classes first so Name Check can be used.
        </p>
      ) : (
        <form onSubmit={handleSubmit} className="flex flex-col gap-2 sm:flex-row">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Student name..."
            className="h-10 flex-1 rounded-lg border border-zinc-300 bg-white px-3 text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-zinc-900 focus:ring-1 focus:ring-zinc-900 focus:outline-none"
          />
          <select
            value={kelas}
            onChange={(e) => setKelas(e.target.value)}
            className="h-10 w-full rounded-lg border border-zinc-300 bg-white px-3 text-sm text-zinc-900 focus:border-zinc-900 focus:ring-1 focus:ring-zinc-900 focus:outline-none sm:w-40"
          >
            <option value="">Class...</option>
            {kelasOptions.map((k) => (
              <option key={k} value={k}>
                {k}
              </option>
            ))}
          </select>
          <button
            type="submit"
            disabled={pending || !query.trim() || !kelas.trim()}
            className="flex h-10 shrink-0 cursor-pointer items-center justify-center gap-2 rounded-lg bg-zinc-900 px-4 text-sm font-medium text-white transition hover:bg-zinc-700 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <Search aria-hidden="true" size={16} />
            {pending ? "Searching..." : "Search"}
          </button>
        </form>
      )}

      {error && <p className="text-xs text-red-600">{error}</p>}

      {results && (
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between gap-2">
            <p className="text-xs text-zinc-500">
              Results for &ldquo;{lastQuery}&rdquo; &middot; Class {lastKelas}
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
          <div className="flex flex-col gap-2">
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
 *
 * Card, not a dense list row (mobile-friendliness pass): icon + label get
 * their own full-width header, detail text gets its own full-width line
 * below instead of being squeezed beside the icon, and the expand toggle is
 * a proper >=44px tappable row (DESIGN.md's tap-target rule) instead of a
 * small text link.
 */
function ResultRow({ result }: { result: NameSearchResult }) {
  const [expanded, setExpanded] = useState(false);
  const otherMatches =
    result.status === "found" || result.status === "found_elsewhere" ? result.matches.slice(1) : [];

  return (
    <div className="overflow-hidden rounded-xl border border-zinc-200 bg-white">
      <div className="flex items-center gap-3 px-3 py-3">
        <StatusIcon status={result.status} />
        <div className="min-w-0 flex-1">
          <span className="font-medium text-zinc-900">{result.label}</span>
          <ResultDetail result={result} />
        </div>
      </div>
      {otherMatches.length > 0 && (
        <>
          <button
            type="button"
            onClick={() => setExpanded((e) => !e)}
            className="flex min-h-11 w-full cursor-pointer items-center justify-between gap-2 border-t border-zinc-100 px-3 py-2.5 text-left text-xs font-medium text-zinc-500 transition hover:bg-zinc-50 hover:text-zinc-900"
          >
            <span>
              {expanded
                ? "Hide other possibilities"
                : `Show ${otherMatches.length} other possibilit${otherMatches.length === 1 ? "y" : "ies"}`}
            </span>
            <ChevronDown
              aria-hidden="true"
              size={14}
              className={clsx("shrink-0 transition-transform", expanded && "rotate-180")}
            />
          </button>
          {expanded && (
            <ul className="flex flex-col gap-2.5 border-t border-zinc-100 bg-zinc-50 px-3 py-2.5 text-xs">
              {otherMatches.map((m, i) => (
                <li key={i} className="text-zinc-600">
                  <span className="font-medium text-zinc-900">{m.name}</span>
                  {m.kelas && <span className="text-zinc-500"> &middot; {m.kelas}</span>}
                  <span className="block text-zinc-400">Possible match</span>
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
      <p className="mt-0.5 break-words text-xs text-zinc-500">
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
      <ul className="mt-1 flex flex-col gap-1.5 text-xs">
        {result.matches.map((m, i) => (
          <li key={i} className="text-amber-700">
            <span className="font-medium">{m.name}</span>
            {m.kelas && <span className="text-zinc-500"> &middot; {m.kelas}</span>}
            <span className="block text-zinc-400">Possible match</span>
          </li>
        ))}
      </ul>
    );
  }
  return null;
}
