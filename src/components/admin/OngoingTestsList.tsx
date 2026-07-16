"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { clsx } from "clsx";
import type { OngoingTestItem } from "@/lib/queries/events";

/** One school currently testing — expands in place to show its classes and assigned testers, no extra fetch (data's already loaded, see getOngoingTestsWithKelas). */
function OngoingTestRow({ item }: { item: OngoingTestItem }) {
  const [expanded, setExpanded] = useState(false);
  const kelas = item.school.kelas;

  return (
    <div className="overflow-hidden rounded-xl border border-zinc-200 bg-white">
      <button
        type="button"
        onClick={() => setExpanded((e) => !e)}
        className="flex min-h-11 w-full cursor-pointer items-center justify-between gap-2 px-4 py-3 text-left transition hover:bg-zinc-50"
      >
        <span className="font-medium text-zinc-900">{item.school.name}</span>
        <span className="flex shrink-0 items-center gap-2 text-xs text-zinc-500">
          {kelas.length} class{kelas.length === 1 ? "" : "es"}
          <ChevronDown
            aria-hidden="true"
            size={14}
            className={clsx("transition-transform", expanded && "rotate-180")}
          />
        </span>
      </button>
      {expanded && (
        <div className="border-t border-zinc-100 bg-zinc-50 px-4 py-3">
          {kelas.length === 0 ? (
            <p className="text-xs text-zinc-400">No classes set up for this school yet.</p>
          ) : (
            <ul className="flex flex-col gap-1.5 text-sm">
              {kelas.map((k) => (
                <li key={k.id} className="flex items-center justify-between gap-3">
                  <span className="text-zinc-900">{k.name}</span>
                  <span className={clsx("text-xs", k.tester ? "text-zinc-600" : "text-zinc-400")}>
                    {k.tester ?? "No tester assigned"}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}

export function OngoingTestsList({ items }: { items: OngoingTestItem[] }) {
  return (
    <div className="flex flex-col gap-2">
      {items.map((item) => (
        <OngoingTestRow key={item.id} item={item} />
      ))}
    </div>
  );
}
