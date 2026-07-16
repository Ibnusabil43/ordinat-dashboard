import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { PageHeader } from "@/components/admin/PageHeader";
import { SchoolForm } from "@/components/admin/SchoolForm";
import { createSchool } from "@/server/actions/schools";
import { getCurrentRole } from "@/lib/auth-guard";

/** ADMIN-only page (Phase 19, BE-P1) — see sekolah/page.tsx. */
export default async function NewSchoolPage() {
  if ((await getCurrentRole()) !== "ADMIN") redirect("/");

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
