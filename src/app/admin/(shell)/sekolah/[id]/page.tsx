import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Users } from "lucide-react";
import { getSchoolById } from "@/lib/queries/schools";
import { PageHeader } from "@/components/admin/PageHeader";
import { SchoolForm } from "@/components/admin/SchoolForm";
import { updateSchool } from "@/server/actions/schools";

export default async function EditSchoolPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const school = await getSchoolById(id);
  if (!school) notFound();

  return (
    <div className="flex flex-col gap-6 p-4 sm:p-6">
      <Link
        href="/admin/sekolah"
        className="flex w-fit items-center gap-1.5 text-sm text-zinc-500 transition hover:text-zinc-900"
      >
        <ArrowLeft aria-hidden="true" size={16} />
        Kembali
      </Link>
      <PageHeader
        title="Edit Sekolah"
        description={school.name}
        action={
          <Link
            href={`/admin/sekolah/${school.id}/kelas`}
            className="flex h-10 items-center justify-center gap-2 rounded-lg border border-zinc-300 bg-white px-4 text-sm font-medium text-zinc-900 transition hover:bg-zinc-50"
          >
            <Users aria-hidden="true" size={16} />
            Kelola Kelas
          </Link>
        }
      />
      <SchoolForm
        action={updateSchool.bind(null, school.id)}
        initial={{ name: school.name, slug: school.slug }}
        submitLabel="Simpan Perubahan"
      />
    </div>
  );
}
