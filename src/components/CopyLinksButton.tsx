"use client";

import { useState } from "react";
import { Copy, Check } from "lucide-react";

/**
 * "Salin Semua Link" — copies `text` (already formatted by buildLinkCopyText)
 * via the Clipboard API. The button itself is the feedback: label/icon swap
 * to a confirmed state for ~2s, then revert. Spec: DESIGN.md §5.
 */
export function CopyLinksButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard API can reject (permissions, insecure context) — fail
      // silently; the button simply won't show the "Tersalin!" confirmation.
    }
  };

  return (
    <button
      type="button"
      onClick={handleCopy}
      className="flex h-10 w-fit cursor-pointer items-center justify-center gap-2 rounded-lg border border-zinc-300 bg-white px-4 text-sm font-medium text-zinc-900 transition hover:bg-zinc-50"
    >
      {copied ? (
        <>
          <Check aria-hidden="true" size={16} />
          Tersalin!
        </>
      ) : (
        <>
          <Copy aria-hidden="true" size={16} />
          Salin Semua Link
        </>
      )}
    </button>
  );
}
