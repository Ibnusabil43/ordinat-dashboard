import { redirect } from "next/navigation";
import { PageHeader } from "@/components/admin/PageHeader";
import { RecapTool } from "@/components/admin/recap/RecapTool";
import { getCurrentRole } from "@/lib/auth-guard";
import { getRecapPickerEvents } from "@/lib/queries/events";

/** ADMIN-only page — PIC_LAPANGAN's Sidebar hides the link, but a direct URL must still bounce. */
export default async function AutomatedRecapPage() {
  if ((await getCurrentRole()) !== "ADMIN") redirect("/");

  const events = await getRecapPickerEvents();

  return (
    <div className="flex flex-col gap-6 p-4 sm:p-6">
      <PageHeader
        title="Automated Recap"
        description="Upload file RAW & Rekap — otomatis isi Score, identitas, format tanggal, dan tandai siswa tanpa data."
      />
      <RecapTool events={events} />
    </div>
  );
}
