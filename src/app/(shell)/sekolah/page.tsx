import Link from "next/link";
import { redirect } from "next/navigation";
import { Plus, Pencil, School } from "lucide-react";
import { getSchools, type SchoolListItem } from "@/lib/queries/schools";
import { PageHeader } from "@/components/admin/PageHeader";
import { DataTable, type DataTableColumn } from "@/components/DataTable";
import { EmptyState } from "@/components/EmptyState";
import { DeleteSchoolButton } from "@/components/admin/DeleteSchoolButton";
import { getCurrentRole } from "@/lib/auth-guard";

/** ADMIN-only page (Phase 19, BE-P1) — PIC_LAPANGAN's Sidebar hides the link, but a direct URL must still bounce. */
export default async function SchoolListPage() {
  if ((await getCurrentRole()) !== "ADMIN") redirect("/");

  const schools = await getSchools();

  const columns: DataTableColumn<SchoolListItem>[] = [
    {
      key: "name",
      header: "Name",
      mobile: "primary",
      render: (s) => <span className="font-medium text-zinc-900">{s.name}</span>,
    },
    {
      key: "slug",
      header: "Slug",
      render: (s) => <span className="font-mono text-xs text-zinc-500">{s.slug}</span>,
    },
    {
      key: "events",
      header: "Schedules",
      render: (s) => s._count.events,
    },
    {
      key: "actions",
      header: "Actions",
      className: "text-right",
      mobile: "action",
      render: (s) => (
        <div className="flex items-center justify-end gap-1">
          <Link
            href={`/sekolah/${s.id}`}
            aria-label={`Edit ${s.name}`}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-zinc-500 transition hover:bg-zinc-100 hover:text-zinc-900"
          >
            <Pencil aria-hidden="true" size={16} />
          </Link>
          <DeleteSchoolButton id={s.id} name={s.name} eventCount={s._count.events} />
        </div>
      ),
    },
  ];

  return (
    <div className="flex flex-col gap-6 p-4 sm:p-6">
      <PageHeader
        title="Schools"
        description="Manage the list of schools running psychotests."
        action={
          <Link
            href="/sekolah/baru"
            className="flex h-10 cursor-pointer items-center justify-center gap-2 rounded-lg bg-zinc-900 px-4 text-sm font-medium text-white transition hover:bg-zinc-700"
          >
            <Plus aria-hidden="true" size={18} />
            Add School
          </Link>
        }
      />

      <DataTable
        columns={columns}
        data={schools}
        getRowKey={(s) => s.id}
        emptyState={
          <EmptyState
            icon={School}
            title="No schools yet"
            description="Add the first school to start scheduling psychotests."
            action={
              <Link
                href="/sekolah/baru"
                className="flex h-10 cursor-pointer items-center justify-center gap-2 rounded-lg bg-zinc-900 px-4 text-sm font-medium text-white transition hover:bg-zinc-700"
              >
                <Plus aria-hidden="true" size={18} />
                Add School
              </Link>
            }
          />
        }
      />
    </div>
  );
}
