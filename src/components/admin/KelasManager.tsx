"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { List, Plus, Trash2, Users } from "lucide-react";
import { DataTable, type DataTableColumn } from "@/components/DataTable";
import { EmptyState } from "@/components/EmptyState";
import { createKelas, updateKelas, deleteKelas } from "@/server/actions/kelas";
import type { KelasListItem } from "@/lib/queries/kelas";
import { KNOWN_TESTER_NAMES } from "@/lib/constants";

/**
 * Inline-editable name cell — uncontrolled input (spreadsheet feel, no
 * separate "edit mode"). Saves on blur/Enter, only if the value actually
 * changed. `key={value}` forces a remount (resetting the uncontrolled DOM
 * value) when the server-side value changes from elsewhere, e.g. after
 * router.refresh().
 */
function EditableNameCell({ kelasId, value }: { kelasId: string; value: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const save = (next: string) => {
    if (next === value) return;
    const fd = new FormData();
    fd.set("name", next);
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
      onBlur={(e) => save(e.currentTarget.value.trim())}
      onKeyDown={(e) => {
        if (e.key === "Enter") e.currentTarget.blur();
      }}
      className="w-full min-w-32 rounded-md border border-transparent bg-transparent px-2 py-1 text-sm text-zinc-900 transition hover:border-zinc-200 focus:border-zinc-900 focus:bg-white focus:outline-none focus:ring-1 focus:ring-zinc-900 disabled:opacity-40"
    />
  );
}

const CUSTOM_TESTER_VALUE = "__custom__";

/**
 * Tester picker — a dropdown of known field-staff names (KNOWN_TESTER_NAMES)
 * instead of free text, so assigning a proctor to a kelas can't drift into a
 * typo'd or username-shaped value. Picking "Lainnya" swaps to a free-text
 * input for a name not on the list (a new hire, an outside proctor, etc.) —
 * the list button switches back. A stored value that isn't in the known
 * list (old free-text data from before this changed, or a previously typed
 * custom name) starts directly in text mode so it's never silently reset.
 */
function TesterSelectCell({ kelasId, value }: { kelasId: string; value: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [customMode, setCustomMode] = useState(value !== "" && !KNOWN_TESTER_NAMES.includes(value));

  const save = (next: string) => {
    if (next === value) return;
    const fd = new FormData();
    fd.set("tester", next);
    startTransition(async () => {
      await updateKelas(kelasId, fd);
      router.refresh();
    });
  };

  if (customMode) {
    return (
      <div className="flex items-center gap-1">
        <input
          key={value}
          type="text"
          autoFocus
          defaultValue={value}
          disabled={pending}
          placeholder="Nama tester"
          onBlur={(e) => save(e.currentTarget.value.trim())}
          onKeyDown={(e) => {
            if (e.key === "Enter") e.currentTarget.blur();
          }}
          className="w-full min-w-32 rounded-md border border-transparent bg-transparent px-2 py-1 text-sm text-zinc-900 placeholder:text-zinc-400 transition hover:border-zinc-200 focus:border-zinc-900 focus:bg-white focus:outline-none focus:ring-1 focus:ring-zinc-900 disabled:opacity-40"
        />
        <button
          type="button"
          title="Pilih dari daftar"
          onClick={() => setCustomMode(false)}
          className="flex shrink-0 cursor-pointer items-center justify-center rounded-md p-1.5 text-zinc-400 transition hover:bg-zinc-100 hover:text-zinc-700"
        >
          <List aria-hidden="true" size={14} />
        </button>
      </div>
    );
  }

  return (
    <select
      key={value}
      defaultValue={value}
      disabled={pending}
      onChange={(e) => {
        if (e.currentTarget.value === CUSTOM_TESTER_VALUE) {
          setCustomMode(true);
          return;
        }
        save(e.currentTarget.value);
      }}
      className="w-full min-w-32 cursor-pointer rounded-md border border-transparent bg-transparent px-2 py-1 text-sm text-zinc-900 transition hover:border-zinc-200 focus:border-zinc-900 focus:bg-white focus:outline-none focus:ring-1 focus:ring-zinc-900 disabled:opacity-40"
    >
      <option value="">Belum ditentukan</option>
      {KNOWN_TESTER_NAMES.map((name) => (
        <option key={name} value={name}>
          {name}
        </option>
      ))}
      <option value={CUSTOM_TESTER_VALUE}>Lainnya (ketik manual)</option>
    </select>
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
      render: (k) => <EditableNameCell kelasId={k.id} value={k.name} />,
    },
    {
      key: "tester",
      header: "Tester",
      render: (k) => <TesterSelectCell kelasId={k.id} value={k.tester ?? ""} />,
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
