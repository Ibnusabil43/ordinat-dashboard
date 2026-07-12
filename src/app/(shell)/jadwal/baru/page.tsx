import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { getSchoolOptions } from "@/lib/queries/schools";
import { PageHeader } from "@/components/admin/PageHeader";
import { EventForm } from "@/components/admin/EventForm";
import { createEvent } from "@/server/actions/events";

export default async function NewEventPage() {
  const schools = await getSchoolOptions();

  return (
    <div className="flex flex-col gap-6 p-4 sm:p-6">
      <Link
        href="/jadwal"
        className="flex w-fit items-center gap-1.5 text-sm text-zinc-500 transition hover:text-zinc-900"
      >
        <ArrowLeft aria-hidden="true" size={16} />
        Kembali
      </Link>
      <PageHeader title="Tambah Jadwal" description="Jadwalkan psikotes untuk sebuah sekolah." />
      <EventForm
        action={createEvent}
        schools={schools}
        submitLabel="Simpan"
        successRedirect="/jadwal"
      />
    </div>
  );
}
