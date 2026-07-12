import Link from "next/link";
import { Plus, ChevronRight, CalendarDays, Pencil } from "lucide-react";
import { getEvents, type EventListItem } from "@/lib/queries/events";
import { PageHeader } from "@/components/admin/PageHeader";
import { DataTable, type DataTableColumn } from "@/components/DataTable";
import { EmptyState } from "@/components/EmptyState";
import { StatusBadge } from "@/components/StatusBadge";
import { formatDateID } from "@/lib/format";

export default async function EventListPage() {
  const events = await getEvents();

  const columns: DataTableColumn<EventListItem>[] = [
    {
      key: "school",
      header: "Sekolah",
      render: (e) => <span className="font-medium text-zinc-900">{e.school.name}</span>,
    },
    {
      key: "date",
      header: "Tanggal",
      render: (e) => formatDateID(e.scheduledDate),
    },
    {
      key: "status",
      header: "Status",
      render: (e) => <StatusBadge status={e.status} />,
    },
    {
      key: "links",
      header: "Link Terisi",
      render: (e) => `${e._count.links}/12`,
    },
    {
      key: "actions",
      header: "Aksi",
      className: "text-right",
      render: (e) => (
        <div className="flex items-center justify-end gap-4">
          <Link
            href={`/jadwal/${e.id}/edit`}
            aria-label={`Ubah jadwal ${e.school.name}`}
            className="inline-flex items-center gap-1 text-sm font-medium text-zinc-500 transition hover:text-zinc-900"
          >
            <Pencil aria-hidden="true" size={14} />
            Ubah
          </Link>
          <Link
            href={`/jadwal/${e.id}`}
            aria-label={`Detail jadwal ${e.school.name}`}
            className="inline-flex items-center gap-1 text-sm font-medium text-zinc-900 transition hover:text-zinc-500"
          >
            Detail
            <ChevronRight aria-hidden="true" size={16} />
          </Link>
        </div>
      ),
    },
  ];

  return (
    <div className="flex flex-col gap-6 p-4 sm:p-6">
      <PageHeader
        title="Manajemen Jadwal"
        description="Kelola jadwal psikotes tiap sekolah dan pantau statusnya."
        action={
          <Link
            href="/jadwal/baru"
            className="flex h-10 cursor-pointer items-center justify-center gap-2 rounded-lg bg-zinc-900 px-4 text-sm font-medium text-white transition hover:bg-zinc-700"
          >
            <Plus aria-hidden="true" size={18} />
            Tambah Jadwal
          </Link>
        }
      />

      <DataTable
        columns={columns}
        data={events}
        getRowKey={(e) => e.id}
        emptyState={
          <EmptyState
            icon={CalendarDays}
            title="Belum ada jadwal"
            description="Buat jadwal psikotes pertama untuk sebuah sekolah."
            action={
              <Link
                href="/jadwal/baru"
                className="flex h-10 cursor-pointer items-center justify-center gap-2 rounded-lg bg-zinc-900 px-4 text-sm font-medium text-white transition hover:bg-zinc-700"
              >
                <Plus aria-hidden="true" size={18} />
                Tambah Jadwal
              </Link>
            }
          />
        }
      />
    </div>
  );
}
