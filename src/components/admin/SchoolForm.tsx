"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { schoolSchema } from "@/lib/validations";
import { SUBTEST_TYPES, resolveActiveSubtests } from "@/lib/constants";
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
  initial?: {
    name: string;
    slug: string;
    driveRawSheetId?: string | null;
    driveFormFolderId?: string | null;
    activeSubtests?: string[];
  };
  submitLabel: string;
}) {
  const router = useRouter();
  const [name, setName] = useState(initial?.name ?? "");
  const [slug, setSlug] = useState(initial?.slug ?? "");
  const [touched, setTouched] = useState<{ name?: boolean; slug?: boolean }>({});
  // Active subtests — defaults to all 13 (resolveActiveSubtests maps [] → all).
  const [activeSubtests, setActiveSubtests] = useState<Set<string>>(
    () => new Set(resolveActiveSubtests(initial?.activeSubtests ?? []).map((s) => s.code)),
  );
  const toggleSubtest = (code: string) =>
    setActiveSubtests((prev) => {
      const next = new Set(prev);
      if (next.has(code)) next.delete(code);
      else next.add(code);
      return next;
    });

  const [state, formAction] = useActionState(async (prev: SchoolActionState | undefined, fd: FormData) => {
    const result = await action(prev, fd);
    // Empty object = success (no error, no fieldErrors).
    if (!result.error && !result.fieldErrors) {
      router.push("/sekolah");
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

      {/*
        Kelas bulk-create rows removed here (Phase 19, FE-U1) — creating
        classes now happens exclusively under the Classes menu
        (/classes/[schoolId]) after the school itself exists, not as a
        create-time shortcut on this form.
      */}
      {/* Persisted School column (BE-L1) — editable on both create and edit. */}
      <div>
        <label htmlFor="driveRawSheetId" className="mb-1.5 block text-sm font-medium text-zinc-900">
          Drive Raw Sheet ID <span className="font-normal text-zinc-400">(opsional)</span>
        </label>
        <input
          id="driveRawSheetId"
          name="driveRawSheetId"
          type="text"
          defaultValue={initial?.driveRawSheetId ?? ""}
          placeholder="Tempel link spreadsheet-nya, atau ID-nya saja"
          className={`${inputClass(false)} font-mono`}
        />
        <p className="mt-1 text-xs text-zinc-500">
          Spreadsheet Google Sheets RAW sekolah ini (12 tab, satu per subtes) — dipakai Monitoring. Tempel
          link lengkapnya langsung juga bisa, ID-nya otomatis diambil.
        </p>
      </div>

      <div>
        <label htmlFor="driveFormFolderId" className="mb-1.5 block text-sm font-medium text-zinc-900">
          Drive Form Folder ID <span className="font-normal text-zinc-400">(opsional)</span>
        </label>
        <input
          id="driveFormFolderId"
          name="driveFormFolderId"
          type="text"
          defaultValue={initial?.driveFormFolderId ?? ""}
          placeholder="Tempel link folder Drive-nya, atau ID-nya saja"
          className={`${inputClass(false)} font-mono`}
        />
        <p className="mt-1 text-xs text-zinc-500">
          Folder Google Drive berisi semua Google Form subtes sekolah ini — dipakai fitur &ldquo;Cek
          Link&rdquo; di Manajemen Link buat ngecek link tiny.cc beneran ngarah ke form yang benar. Tempel
          link folder-nya langsung juga bisa, ID-nya otomatis diambil.
        </p>
      </div>

      <div>
        <label className="mb-1.5 block text-sm font-medium text-zinc-900">Subtes</label>
        <p className="mb-2 text-xs text-zinc-500">
          Default semua (EPPS–PAPI). Hilangkan centang subtes yang tidak dipakai sekolah ini — berlaku
          untuk semua jadwal sekolah ini, hanya subtes tercentang yang punya slot link.
        </p>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {SUBTEST_TYPES.map((s) => {
            const checked = activeSubtests.has(s.code);
            return (
              <label
                key={s.code}
                className="flex cursor-pointer items-center gap-2 rounded-lg border border-zinc-200 px-3 py-2 text-sm text-zinc-900 transition hover:bg-zinc-50"
              >
                <input
                  type="checkbox"
                  name="subtest"
                  value={s.code}
                  checked={checked}
                  onChange={() => toggleSubtest(s.code)}
                  className="h-4 w-4 accent-zinc-900"
                />
                <span className="truncate">{s.label}</span>
              </label>
            );
          })}
        </div>
      </div>

      {state?.error && <p className="text-xs text-red-600">{state.error}</p>}

      <div className="flex gap-2">
        <SubmitButton label={submitLabel} />
        <Link
          href="/sekolah"
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
