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
        aria-label={`Delete ${name}`}
        onClick={() => setOpen(true)}
        className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-lg text-zinc-500 transition hover:bg-red-50 hover:text-red-600"
      >
        <Trash2 aria-hidden="true" size={16} />
      </button>

      <ConfirmModal
        open={open}
        title="Delete school?"
        description={
          <>
            Deleting <span className="font-medium text-zinc-900">{name}</span> will also delete{" "}
            {eventCount > 0 ? (
              <>
                its <span className="font-medium text-zinc-900">{eventCount} schedule{eventCount === 1 ? "" : "s"}</span>, along
                with all subtest links and recap history.
              </>
            ) : (
              <>all associated subtest links and recap history.</>
            )}{" "}
            This action cannot be undone.
          </>
        }
        confirmLabel="Delete"
        danger
        pending={pending}
        error={error}
        onConfirm={confirm}
        onCancel={() => setOpen(false)}
      />
    </>
  );
}
