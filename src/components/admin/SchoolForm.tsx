"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { schoolSchema } from "@/lib/validations";
import type { SchoolActionState } from "@/server/actions/schools";

type Action = (
  prevState: SchoolActionState | undefined,
  formData: FormData,
) => Promise<SchoolActionState>;

function SubmitButton({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="flex h-10 cursor-pointer items-center justify-center rounded-lg bg-zinc-900 px-4 text-sm font-medium text-white transition hover:bg-zinc-700 disabled:cursor-not-allowed disabled:opacity-40"
    >
      {pending ? "Menyimpan..." : label}
    </button>
  );
}

/**
 * Shared create/edit form. The parent passes the correct bound action
 * (createSchool, or updateSchool.bind(null, id)). On success the action
 * returns an empty state ({}), and we navigate back to the list.
 *
 * Client-side Zod (schoolSchema) gives inline feedback as you type; the server
 * re-validates and owns cross-row checks like duplicate slug (FE-F2).
 */
export function SchoolForm({
  action,
  initial,
  submitLabel,
}: {
  action: Action;
  initial?: { name: string; slug: string; driveRawSheetId?: string | null };
  submitLabel: string;
}) {
  const router = useRouter();
  const [name, setName] = useState(initial?.name ?? "");
  const [slug, setSlug] = useState(initial?.slug ?? "");
  const [touched, setTouched] = useState<{ name?: boolean; slug?: boolean }>({});

  const [state, formAction] = useActionState(async (prev: SchoolActionState | undefined, fd: FormData) => {
    const result = await action(prev, fd);
    // Empty object = success (no error, no fieldErrors).
    if (!result.error && !result.fieldErrors) {
      router.push("/admin/sekolah");
      router.refresh();
    }
    return result;
  }, undefined);

  // Client-side mirror for immediate feedback (server remains source of truth).
  const clientCheck = schoolSchema.safeParse({ name, slug });
  const clientErrors = clientCheck.success
    ? {}
    : clientCheck.error.flatten().fieldErrors;

  const nameError =
    (touched.name ? clientErrors.name?.[0] : undefined) ?? state?.fieldErrors?.name;
  const slugError =
    (touched.slug ? clientErrors.slug?.[0] : undefined) ?? state?.fieldErrors?.slug;

  return (
    <form action={formAction} className="flex max-w-lg flex-col gap-4">
      <div>
        <label htmlFor="name" className="mb-1.5 block text-sm font-medium text-zinc-900">
          Nama Sekolah
        </label>
        <input
          id="name"
          name="name"
          type="text"
          required
          value={name}
          onChange={(e) => setName(e.target.value)}
          onBlur={() => setTouched((t) => ({ ...t, name: true }))}
          placeholder="SMAN 1 CIWARINGIN"
          className={inputClass(!!nameError)}
        />
        {nameError && <p className="mt-1 text-xs text-red-600">{nameError}</p>}
      </div>

      <div>
        <label htmlFor="slug" className="mb-1.5 block text-sm font-medium text-zinc-900">
          Slug
        </label>
        <input
          id="slug"
          name="slug"
          type="text"
          required
          value={slug}
          onChange={(e) => setSlug(e.target.value.toUpperCase())}
          onBlur={() => setTouched((t) => ({ ...t, slug: true }))}
          placeholder="CIWARINGIN26"
          className={`${inputClass(!!slugError)} font-mono`}
        />
        <p className="mt-1 text-xs text-zinc-500">
          Dipakai di pola URL tiny.cc, mis. <span className="font-mono">tiny.cc/{slug || "SLUG"}-EPPS</span>.
        </p>
        {slugError && <p className="mt-1 text-xs text-red-600">{slugError}</p>}
      </div>

      {/* Bulk-create shortcut (BE-G4) — create-only, no `initial` means this is a new school.
          Editing an existing school doesn't re-trigger kelas creation; use "Kelola Kelas" for that. */}
      {!initial && (
        <div>
          <label htmlFor="kelasCount" className="mb-1.5 block text-sm font-medium text-zinc-900">
            Jumlah Kelas <span className="font-normal text-zinc-400">(opsional)</span>
          </label>
          <input
            id="kelasCount"
            name="kelasCount"
            type="number"
            min={0}
            max={50}
            placeholder="0"
            className={inputClass(false)}
          />
          <p className="mt-1 text-xs text-zinc-500">
            Langsung buat sejumlah baris kelas kosong. Bisa ditambah/diubah kapan saja lewat &ldquo;Kelola
            Kelas&rdquo;.
          </p>
        </div>
      )}

      {/* Persisted School column (BE-L1) — editable on both create and edit,
          unlike Jumlah Kelas above (a one-time bulk-create shortcut, not a field). */}
      <div>
        <label htmlFor="driveRawSheetId" className="mb-1.5 block text-sm font-medium text-zinc-900">
          Drive Raw Sheet ID <span className="font-normal text-zinc-400">(opsional)</span>
        </label>
        <input
          id="driveRawSheetId"
          name="driveRawSheetId"
          type="text"
          defaultValue={initial?.driveRawSheetId ?? ""}
          placeholder="1E7P6Cj0Hr3dD3fTOK3VFGz85xN6GH-PTd2oacFMQe94"
          className={`${inputClass(false)} font-mono`}
        />
        <p className="mt-1 text-xs text-zinc-500">
          ID spreadsheet Google Sheets RAW sekolah ini (12 tab, satu per subtes) — dipakai Monitoring.
          Salin dari URL spreadsheet-nya, bagian setelah <span className="font-mono">/d/</span>.
        </p>
      </div>

      {state?.error && <p className="text-xs text-red-600">{state.error}</p>}

      <div className="flex gap-2">
        <SubmitButton label={submitLabel} />
        <Link
          href="/admin/sekolah"
          className="flex h-10 items-center justify-center rounded-lg border border-zinc-300 bg-white px-4 text-sm font-medium text-zinc-900 transition hover:bg-zinc-50"
        >
          Batal
        </Link>
      </div>
    </form>
  );
}

function inputClass(hasError: boolean) {
  return `h-10 w-full rounded-lg border bg-white px-3 text-sm text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:ring-1 ${
    hasError
      ? "border-red-500 focus:border-red-500 focus:ring-red-500"
      : "border-zinc-300 focus:border-zinc-900 focus:ring-zinc-900"
  }`;
}
