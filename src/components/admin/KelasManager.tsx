"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus, Trash2, Users } from "lucide-react";
import { DataTable, type DataTableColumn } from "@/components/DataTable";
import { EmptyState } from "@/components/EmptyState";
import { createKelas, updateKelas, deleteKelas } from "@/server/actions/kelas";
import type { KelasListItem } from "@/lib/queries/kelas";

/**
 * Inline-editable cell — uncontrolled input (spreadsheet feel, no separate
 * "edit mode"). Saves on blur/Enter, only if the value actually changed.
 * `key={value}` forces a remount (resetting the uncontrolled DOM value) when
 * the server-side value changes from elsewhere, e.g. after router.refresh().
 */
function EditableCell({
  kelasId,
  field,
  value,
}: {
  kelasId: string;
  field: "name" | "tester";
  value: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const save = (next: string) => {
    if (next === value) return;
    const fd = new FormData();
    fd.set(field, next);
    startTransition(async () => {
      await updateKelas(kelasId, fd);
      router.refresh();
    });
  };

  return (
    <input
      key={value}
      type="text"
      defaultValue={value}
      disabled={pending}
      placeholder={field === "tester" ? "Belum ditentukan" : undefined}
      onBlur={(e) => save(e.currentTarget.value.trim())}
      onKeyDown={(e) => {
        if (e.key === "Enter") e.currentTarget.blur();
      }}
      className="w-full min-w-32 rounded-md border border-transparent bg-transparent px-2 py-1 text-sm text-zinc-900 placeholder:text-zinc-400 transition hover:border-zinc-200 focus:border-zinc-900 focus:bg-white focus:outline-none focus:ring-1 focus:ring-zinc-900 disabled:opacity-40"
    />
  );
}

function RemoveButton({ kelasId, name }: { kelasId: string; name: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  return (
    <button
      type="button"
      aria-label={`Hapus ${name}`}
      disabled={pending}
      onClick={() =>
        startTransition(async () => {
          await deleteKelas(kelasId);
          router.refresh();
        })
      }
      className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-lg text-zinc-500 transition hover:bg-red-50 hover:text-red-600 disabled:opacity-40"
    >
      <Trash2 aria-hidden="true" size={16} />
    </button>
  );
}

/** Admin Kelas & Tester management (FE-K1–K3) — spreadsheet-like, no separate save step. */
export function KelasManager({ schoolId, kelas }: { schoolId: string; kelas: KelasListItem[] }) {
  const router = useRouter();
  const [addPending, startAddTransition] = useTransition();

  const addKelas = () => {
    const fd = new FormData();
    fd.set("name", `Kelas ${kelas.length + 1}`);
    startAddTransition(async () => {
      await createKelas(schoolId, fd);
      router.refresh();
    });
  };

  const columns: DataTableColumn<KelasListItem>[] = [
    {
      key: "name",
      header: "Kelas",
      render: (k) => <EditableCell kelasId={k.id} field="name" value={k.name} />,
    },
    {
      key: "tester",
      header: "Tester",
      render: (k) => <EditableCell kelasId={k.id} field="tester" value={k.tester ?? ""} />,
    },
    {
      key: "actions",
      header: "",
      className: "w-10 text-right",
      render: (k) => <RemoveButton kelasId={k.id} name={k.name} />,
    },
  ];

  return (
    <div className="flex flex-col gap-4">
      <DataTable
        columns={columns}
        data={kelas}
        getRowKey={(k) => k.id}
        emptyState={
          <EmptyState
            icon={Users}
            title="Belum ada kelas"
            description="Tambahkan di sini atau saat membuat sekolah."
          />
        }
      />
      <button
        type="button"
        onClick={addKelas}
        disabled={addPending}
        className="flex h-10 w-fit cursor-pointer items-center justify-center gap-2 rounded-lg border border-zinc-300 bg-white px-4 text-sm font-medium text-zinc-900 transition hover:bg-zinc-50 disabled:opacity-40"
      >
        <Plus aria-hidden="true" size={18} />
        Tambah Kelas
      </button>
    </div>
  );
}
