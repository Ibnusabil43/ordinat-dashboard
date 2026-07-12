import { redirect } from "next/navigation";
import { ClipboardList, FolderOpen } from "lucide-react";
import { getRekapEvents } from "@/lib/queries/events";
import { PageHeader } from "@/components/admin/PageHeader";
import { EmptyState } from "@/components/EmptyState";
import { MarkResumeButton } from "@/components/admin/MarkResumeButton";
import { formatDateID } from "@/lib/format";
import { getCurrentRole } from "@/lib/auth-guard";

/** ADMIN-only page (BE-H2) — PIC_LAPANGAN's Sidebar hides the link, but a direct URL must still bounce. */
export default async function RekapMenuPage() {
  if ((await getCurrentRole()) !== "ADMIN") redirect("/admin");

  const events = await getRekapEvents();
  const folderId = process.env.GOOGLE_DRIVE_RESULTS_FOLDER_ID;

  return (
    <div className="flex flex-col gap-6 p-4 sm:p-6">
      <PageHeader
        title="Menu Rekap"
        description="Jadwal yang sedang direkap. Tandai selesai setelah rekap final."
        action={
          folderId && (
            <a
              href={`https://drive.google.com/drive/folders/${folderId}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex h-10 items-center justify-center gap-2 rounded-lg border border-zinc-300 bg-white px-4 text-sm font-medium text-zinc-900 transition hover:bg-zinc-50"
            >
              <FolderOpen aria-hidden="true" size={16} />
              Buka Folder Hasil Rekap
            </a>
          )
        }
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
