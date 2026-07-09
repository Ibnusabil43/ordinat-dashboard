"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CheckCheck } from "lucide-react";
import { ConfirmModal } from "@/components/ConfirmModal";
import { markResume } from "@/server/actions/events";

/**
 * "Tandai Selesai" — moves a REKAP event to DONE via markResume. Final and
 * irreversible, so it always goes through a confirmation modal that says so.
 * Not destructive (nothing is deleted), so the confirm button is the normal
 * zinc-900 style, not red.
 */
export function MarkResumeButton({ id, schoolName }: { id: string; schoolName: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string>();
  const [pending, startTransition] = useTransition();

  const confirm = () => {
    setError(undefined);
    startTransition(async () => {
      const res = await markResume(id);
      if (res?.error) {
        setError(res.error);
        return;
      }
      setOpen(false);
      router.refresh();
    });
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex h-10 w-full cursor-pointer items-center justify-center gap-2 rounded-lg bg-zinc-900 px-4 text-sm font-medium text-white transition hover:bg-zinc-700 sm:w-auto"
      >
        <CheckCheck aria-hidden="true" size={16} />
        Tandai Selesai
      </button>

      <ConfirmModal
        open={open}
        title="Tandai rekap selesai?"
        description={
          <>
            Menyelesaikan rekap <span className="font-medium text-zinc-900">{schoolName}</span> akan
            memindahkan statusnya ke <span className="font-medium text-zinc-900">Tahap Resume</span>.
            Tindakan ini final dan tidak bisa dibatalkan.
          </>
        }
        confirmLabel="Tandai Selesai"
        pending={pending}
        error={error}
        onConfirm={confirm}
        onCancel={() => setOpen(false)}
      />
    </>
  );
}
