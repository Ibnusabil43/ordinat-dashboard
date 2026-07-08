"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { ConfirmModal } from "@/components/ConfirmModal";
import { deleteSchool } from "@/server/actions/schools";

/**
 * Delete button + confirmation modal for one school. The modal explicitly
 * warns about the cascade (events, links, recap history) — FE-F3 / BE-B3.
 */
export function DeleteSchoolButton({
  id,
  name,
  eventCount,
}: {
  id: string;
  name: string;
  eventCount: number;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string>();
  const [pending, startTransition] = useTransition();

  const confirm = () => {
    setError(undefined);
    startTransition(async () => {
      const res = await deleteSchool(id);
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
        aria-label={`Hapus ${name}`}
        onClick={() => setOpen(true)}
        className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-lg text-zinc-500 transition hover:bg-red-50 hover:text-red-600"
      >
        <Trash2 aria-hidden="true" size={16} />
      </button>

      <ConfirmModal
        open={open}
        title="Hapus sekolah?"
        description={
          <>
            Menghapus <span className="font-medium text-zinc-900">{name}</span> juga akan menghapus{" "}
            {eventCount > 0 ? (
              <>
                <span className="font-medium text-zinc-900">{eventCount} jadwal</span> beserta
                seluruh link subtes dan riwayat rekapnya.
              </>
            ) : (
              <>seluruh link subtes dan riwayat rekap yang terkait.</>
            )}{" "}
            Tindakan ini tidak bisa dibatalkan.
          </>
        }
        confirmLabel="Hapus"
        danger
        pending={pending}
        error={error}
        onConfirm={confirm}
        onCancel={() => setOpen(false)}
      />
    </>
  );
}
