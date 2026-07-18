"use client";

import { useState } from "react";
import { AlertOctagon, AlertTriangle, ChevronDown, ChevronRight } from "lucide-react";
import { Tabs } from "@/components/Tabs";
import type { PendingMatch } from "@/lib/recap-types";

/**
 * `severity` badge (Phase 20, FE-Y1) — zinc-intensity + icon only, same
 * convention as STATUS_STYLE (dark/filled = more serious). Not a new color
 * exception: Cek Nama and Agenda are the only two confirmed ones (DESIGN.md
 * §2), this isn't a third. Renders nothing for older items without a
 * `severity` (backward compatible with a pre-Phase-20 Flask response).
 */
function SeverityBadge({ severity }: { severity?: "block" | "warn" }) {
  if (severity === "block") {
    return (
      <span className="inline-flex w-fit items-center gap-1 rounded-full bg-zinc-900 px-2 py-0.5 text-xs font-medium text-white">
        <AlertOctagon aria-hidden="true" size={12} />
        Needs review
      </span>
    );
  }
  if (severity === "warn") {
    return (
      <span className="inline-flex w-fit items-center gap-1 rounded-full border border-zinc-300 px-2 py-0.5 text-xs font-medium text-zinc-600">
        <AlertTriangle aria-hidden="true" size={12} />
        Heads up
      </span>
    );
  }
  return null;
}

/**
 * One "Students Not On Any Roster" entry. Expandable only when `confirmable`
 * (Flask found a closest-candidate roster row plausible enough to offer, see
 * LEFTOVER_CANDIDATE_MIN in app.py) — expanding reveals one checkbox per
 * subtest this student appears in, so an admin can confirm just the subtests
 * they're sure about rather than an all-or-nothing accept for the whole
 * student. Non-confirmable items (no plausible candidate at all, or the score
 * was too low to trust) stay plain informational text, same as before.
 */
function LeftoverRow({
  item,
  selected,
  onToggleSubtes,
}: {
  item: PendingMatch;
  selected: string[];
  onToggleSubtes: (subtes: string) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const subtesList = item.subtes && item.subtes !== "-" ? item.subtes.split(", ") : [];

  return (
    <div className="rounded-lg bg-zinc-50 px-3 py-2 text-sm">
      <div className="flex items-center justify-between gap-2">
        <span className="font-medium text-zinc-900">{item.nama_raw}</span>
        {item.confirmable && subtesList.length > 0 && (
          <button
            type="button"
            onClick={() => setExpanded((v) => !v)}
            className="flex shrink-0 cursor-pointer items-center gap-1 text-xs font-medium text-zinc-600 hover:text-zinc-900"
          >
            {selected.length > 0 && (
              <span className="rounded-full bg-zinc-900 px-1.5 py-0.5 text-[10px] text-white">
                {selected.length}
              </span>
            )}
            {expanded ? "Hide subtests" : "Confirm subtests"}
            {expanded ? (
              <ChevronDown aria-hidden="true" size={14} />
            ) : (
              <ChevronRight aria-hidden="true" size={14} />
            )}
          </button>
        )}
      </div>

      {item.closest_candidate && (
        <p className="mt-0.5 text-xs text-zinc-600">
          Closest match: <span className="font-medium">{item.closest_candidate}</span>{" "}
          ({Math.round(item.score * 100)}%)
          {!item.confirmable && " — confirm manually in the Recap file if correct."}
        </p>
      )}
      {item.detail && <p className="mt-0.5 text-xs text-zinc-500">{item.detail}</p>}

      {expanded && item.confirmable && (
        <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1.5 border-t border-zinc-200 pt-2">
          {subtesList.map((s) => (
            <label key={s} className="flex cursor-pointer items-center gap-1.5 text-xs text-zinc-700">
              <input
                type="checkbox"
                checked={selected.includes(s)}
                onChange={() => onToggleSubtes(s)}
                className="h-3.5 w-3.5 cursor-pointer accent-zinc-900"
              />
              {s}
            </label>
          ))}
        </div>
      )}
    </div>
  );
}

/**
 * Confirmation table for borderline name matches (score below AUTO_CONFIDENCE
 * in the Flask matcher). Unchecked rows are treated as "not found" once
 * submitted — this mirrors the original tool's behavior exactly.
 *
 * Phase 20 (FE-Y1/FE-Y2): `kind: "leftover"` items — RAW students not on any
 * Gugus roster — are split out into a separate section below (LeftoverRow).
 * They never had a resolvable write target before this pass (Flask's /review
 * handler used to just skip them), so mixing them into the main table would
 * misleadingly imply the same one-click action applied. Items with no `kind`
 * at all (a pre-Phase-20 Flask response) fall through to the confirmable
 * table exactly as before.
 */
export function ReviewTable({
  pending,
  decisions,
  onToggle,
  onToggleLeftoverSubtes,
  onSubmit,
  busy,
}: {
  pending: PendingMatch[];
  decisions: Record<number, boolean | string[]>;
  onToggle: (id: number) => void;
  onToggleLeftoverSubtes: (id: number, subtes: string) => void;
  onSubmit: () => void;
  busy: boolean;
}) {
  const confirmable = pending.filter((p) => p.kind !== "leftover");
  const leftover = pending.filter((p) => p.kind === "leftover");
  const gugusNums = Array.from(new Set(confirmable.map((p) => p.gugus))).sort((a, b) => a - b);

  const confirmTable = (rows: PendingMatch[]) => (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-zinc-200 text-left text-xs font-medium text-zinc-500">
            <th className="px-2 py-2"></th>
            <th className="px-2 py-2">Gugus</th>
            <th className="px-2 py-2">Subtest</th>
            <th className="px-2 py-2">Name in Recap</th>
            <th className="px-2 py-2">Name in RAW</th>
            <th className="px-2 py-2">Score</th>
            <th className="px-2 py-2">Reason</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-zinc-100">
          {rows.map((p) => (
            <tr key={p.id}>
              <td className="px-2 py-2">
                <input
                  type="checkbox"
                  checked={!!decisions[p.id]}
                  onChange={() => onToggle(p.id)}
                  className="h-4 w-4 cursor-pointer accent-zinc-900"
                />
              </td>
              <td className="px-2 py-2 text-zinc-700">Gugus {p.gugus}</td>
              <td className="px-2 py-2 text-zinc-700">{p.subtes}</td>
              <td className="px-2 py-2 font-medium text-zinc-900">{p.nama_rekap}</td>
              <td className="px-2 py-2 text-zinc-700">{p.nama_raw}</td>
              <td className="px-2 py-2">
                <span className="inline-flex items-center rounded-full bg-zinc-100 px-2.5 py-1 text-xs font-medium text-zinc-900">
                  {Math.round(p.score * 100)}%
                </span>
              </td>
              <td className="px-2 py-2">
                <div className="flex flex-col gap-1">
                  <SeverityBadge severity={p.severity} />
                  {p.detail && <span className="text-xs text-zinc-500">{p.detail}</span>}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );

  return (
    <div className="flex flex-col gap-6">
      <div className="rounded-2xl border border-zinc-300 bg-white p-4 sm:p-6">
        <h2 className="text-lg font-semibold text-zinc-900">Review Name Matches</h2>
        <p className="mt-1 text-sm text-zinc-500">
          {confirmable.length} name match(es) scored below 90% similarity — review and confirm
          before the scores are written to the Recap. Unchecked rows are treated as not found.
        </p>

        <div className="mt-4">
          {gugusNums.length > 1 ? (
            <Tabs
              tabs={[
                { key: "all", label: `All (${confirmable.length})`, content: confirmTable(confirmable) },
                ...gugusNums.map((g) => ({
                  key: String(g),
                  label: `Gugus ${g} (${confirmable.filter((p) => p.gugus === g).length})`,
                  content: confirmTable(confirmable.filter((p) => p.gugus === g)),
                })),
              ]}
            />
          ) : (
            confirmTable(confirmable)
          )}
        </div>

        <button
          type="button"
          onClick={onSubmit}
          disabled={busy}
          className="mt-4 flex h-10 cursor-pointer items-center justify-center rounded-lg bg-zinc-900 px-4 text-sm font-medium text-white transition hover:bg-zinc-700 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {busy ? "Submitting..." : "Confirm & Continue"}
        </button>
      </div>

      {leftover.length > 0 && (
        <div className="rounded-2xl border border-zinc-200 bg-white p-4 sm:p-6">
          <h2 className="text-lg font-semibold text-zinc-900">Students Not On Any Roster</h2>
          <p className="mt-1 text-sm text-zinc-500">
            Found in RAW but not matched to any Gugus. Where a plausible candidate was found,
            expand a row to confirm specific subtests — that data gets written when you hit
            Confirm & Continue above.
          </p>
          <div className="mt-4 flex flex-col gap-2">
            {leftover.map((item) => (
              <LeftoverRow
                key={item.id}
                item={item}
                selected={Array.isArray(decisions[item.id]) ? (decisions[item.id] as string[]) : []}
                onToggleSubtes={(subtes) => onToggleLeftoverSubtes(item.id, subtes)}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
