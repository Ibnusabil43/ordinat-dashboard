"use client";

import { useEffect, useRef } from "react";
import { clsx } from "clsx";

interface ConfirmModalProps {
  open: boolean;
  title: string;
  description: React.ReactNode;
  confirmLabel: string;
  cancelLabel?: string;
  /** Styles the confirm button as destructive (red). Default false. */
  danger?: boolean;
  pending?: boolean;
  error?: string;
  onConfirm: () => void;
  onCancel: () => void;
}

/**
 * Reusable confirmation dialog for destructive/final actions. Spec: DESIGN.md §5.
 * Closes on Esc / overlay click; focuses the confirm button on open.
 */
export function ConfirmModal({
  open,
  title,
  description,
  confirmLabel,
  cancelLabel = "Batal",
  danger = false,
  pending = false,
  error,
  onConfirm,
  onCancel,
}: ConfirmModalProps) {
  const confirmRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    confirmRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !pending) onCancel();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, pending, onCancel]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-zinc-900/40 backdrop-blur-[1px]"
        aria-hidden="true"
        onClick={() => !pending && onCancel()}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="confirm-modal-title"
        className="relative w-full max-w-md rounded-2xl bg-white p-6 shadow-lg"
      >
        <h2 id="confirm-modal-title" className="text-lg font-semibold text-zinc-900">
          {title}
        </h2>
        <div className="mt-2 text-sm text-zinc-500">{description}</div>

        {error && <p className="mt-3 text-xs text-red-600">{error}</p>}

        <div className="mt-6 flex justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            disabled={pending}
            className="flex h-10 cursor-pointer items-center justify-center rounded-lg border border-zinc-300 bg-white px-4 text-sm font-medium text-zinc-900 transition hover:bg-zinc-50 disabled:opacity-40"
          >
            {cancelLabel}
          </button>
          <button
            ref={confirmRef}
            type="button"
            onClick={onConfirm}
            disabled={pending}
            className={clsx(
              "flex h-10 cursor-pointer items-center justify-center rounded-lg px-4 text-sm font-medium text-white transition disabled:cursor-not-allowed disabled:opacity-40",
              danger ? "bg-red-600 hover:bg-red-700" : "bg-zinc-900 hover:bg-zinc-700",
            )}
          >
            {pending ? "Memproses..." : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
