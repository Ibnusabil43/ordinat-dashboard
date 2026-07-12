"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { eventSchema } from "@/lib/validations";
import type { SchoolOption } from "@/lib/queries/schools";
import type { EventActionState } from "@/server/actions/events";

type Action = (
  prevState: EventActionState | undefined,
  formData: FormData,
) => Promise<EventActionState>;

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
 * Shared create/edit form for an event. Parent passes the bound action and
 * where to go on success. Status is intentionally NOT editable here — it's
 * system-managed via the state machine (PRD FR-6).
 */
export function EventForm({
  action,
  schools,
  initial,
  submitLabel,
  successRedirect,
  cancelHref = "/jadwal",
}: {
  action: Action;
  schools: SchoolOption[];
  initial?: { schoolId: string; scheduledDate: string };
  submitLabel: string;
  successRedirect: string;
  cancelHref?: string;
}) {
  const router = useRouter();
  const [schoolId, setSchoolId] = useState(initial?.schoolId ?? "");
  const [scheduledDate, setScheduledDate] = useState(initial?.scheduledDate ?? "");
  const [touched, setTouched] = useState<{ schoolId?: boolean; scheduledDate?: boolean }>({});

  const [state, formAction] = useActionState(
    async (prev: EventActionState | undefined, fd: FormData) => {
      const result = await action(prev, fd);
      if (!result.error && !result.fieldErrors) {
        router.push(successRedirect);
        router.refresh();
      }
      return result;
    },
    undefined,
  );

  const clientCheck = eventSchema.safeParse({ schoolId, scheduledDate });
  const clientErrors = clientCheck.success ? {} : clientCheck.error.flatten().fieldErrors;

  const schoolError =
    (touched.schoolId ? clientErrors.schoolId?.[0] : undefined) ?? state?.fieldErrors?.schoolId;
  const dateError =
    (touched.scheduledDate ? clientErrors.scheduledDate?.[0] : undefined) ??
    state?.fieldErrors?.scheduledDate;

  return (
    <form action={formAction} className="flex max-w-lg flex-col gap-4">
      <div>
        <label htmlFor="schoolId" className="mb-1.5 block text-sm font-medium text-zinc-900">
          Sekolah
        </label>
        <select
          id="schoolId"
          name="schoolId"
          required
          value={schoolId}
          onChange={(e) => setSchoolId(e.target.value)}
          onBlur={() => setTouched((t) => ({ ...t, schoolId: true }))}
          className={selectClass(!!schoolError)}
        >
          <option value="" disabled>
            Pilih sekolah…
          </option>
          {schools.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>
        {schoolError && <p className="mt-1 text-xs text-red-600">{schoolError}</p>}
        {schools.length === 0 && (
          <p className="mt-1 text-xs text-zinc-500">
            Belum ada sekolah.{" "}
            <Link href="/sekolah/baru" className="text-zinc-900 underline">
              Tambah sekolah dulu
            </Link>
            .
          </p>
        )}
      </div>

      <div>
        <label htmlFor="scheduledDate" className="mb-1.5 block text-sm font-medium text-zinc-900">
          Tanggal Pelaksanaan
        </label>
        <input
          id="scheduledDate"
          name="scheduledDate"
          type="date"
          required
          value={scheduledDate}
          onChange={(e) => setScheduledDate(e.target.value)}
          onBlur={() => setTouched((t) => ({ ...t, scheduledDate: true }))}
          className={inputClass(!!dateError)}
        />
        {dateError && <p className="mt-1 text-xs text-red-600">{dateError}</p>}
      </div>

      {state?.error && <p className="text-xs text-red-600">{state.error}</p>}

      <div className="flex gap-2">
        <SubmitButton label={submitLabel} />
        <Link
          href={cancelHref}
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

function selectClass(hasError: boolean) {
  return inputClass(hasError);
}
