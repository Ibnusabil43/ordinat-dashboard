import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { PageHeader } from "@/components/admin/PageHeader";
import { SchoolForm } from "@/components/admin/SchoolForm";
import { createSchool } from "@/server/actions/schools";

export default function NewSchoolPage() {
  return (
    <div className="flex flex-col gap-6 p-4 sm:p-6">
      <Link
        href="/sekolah"
        className="flex w-fit items-center gap-1.5 text-sm text-zinc-500 transition hover:text-zinc-900"
      >
        <ArrowLeft aria-hidden="true" size={16} />
        Kembali
      </Link>
      <PageHeader title="Tambah Sekolah" description="Daftarkan sekolah baru." />
      <SchoolForm action={createSchool} submitLabel="Simpan" />
    </div>
  );
}
