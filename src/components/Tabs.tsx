"use client";

import { useState } from "react";
import { clsx } from "clsx";

export interface TabDef {
  key: string;
  label: string;
  content: React.ReactNode;
}

/**
 * Generic 2-tab switcher (DESIGN.md §5) — plain buttons, not a full ARIA
 * tablist/tabpanel pair (not worth the ceremony for 2 tabs). No scroll
 * containment of its own — the page it lives on (Event Detail) already
 * scrolls via the admin shell's own container.
 */
export function Tabs({ tabs, defaultTab }: { tabs: TabDef[]; defaultTab?: string }) {
  const [active, setActive] = useState(defaultTab ?? tabs[0]?.key);
  const activeTab = tabs.find((t) => t.key === active) ?? tabs[0];

  return (
    <div className="flex flex-col gap-4">
      <div className="flex gap-1">
        {tabs.map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => setActive(t.key)}
            className={clsx(
              "cursor-pointer rounded-lg px-3 py-1.5 text-sm font-medium transition",
              t.key === activeTab?.key
                ? "bg-zinc-900 text-white"
                : "text-zinc-500 hover:bg-zinc-100",
            )}
          >
            {t.label}
          </button>
        ))}
      </div>
      {activeTab?.content}
    </div>
  );
}
