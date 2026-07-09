import { ClipboardList } from "lucide-react";
import { getRekapEvents } from "@/lib/queries/events";
import { PageHeader } from "@/components/admin/PageHeader";
import { EmptyState } from "@/components/EmptyState";
import { MarkResumeButton } from "@/components/admin/MarkResumeButton";
import { formatDateID } from "@/lib/format";

export default async function RekapMenuPage() {
  const events = await getRekapEvents();

  return (
    <div className="flex flex-col gap-6 p-4 sm:p-6">
      <PageHeader
        title="Menu Rekap"
        description="Jadwal yang sedang direkap. Tandai selesai setelah rekap final."
      />

      {events.length === 0 ? (
        <EmptyState
          icon={ClipboardList}
          title="Tidak ada rekap berjalan"
          description="Jadwal akan muncul di sini saat proses rekap dimulai dari tool Automated Recap."
        />
      ) : (
        <div className="flex flex-col gap-3">
          {events.map((e) => {
            const startedAt = e.recapJobs[0]?.startedAt;
            return (
              <div
                key={e.id}
                className="flex flex-col gap-4 rounded-2xl border border-zinc-200 bg-white p-4 sm:flex-row sm:items-center sm:justify-between sm:p-6"
              >
                <div>
                  <h2 className="font-semibold text-zinc-900">{e.school.name}</h2>
                  <p className="mt-1 text-sm text-zinc-500">
                    Tanggal tes: {formatDateID(e.scheduledDate)}
                    {startedAt && <> · Rekap mulai: {formatDateID(startedAt)}</>}
                  </p>
                </div>
                <MarkResumeButton id={e.id} schoolName={e.school.name} />
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
