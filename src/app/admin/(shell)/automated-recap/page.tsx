import { PageHeader } from "@/components/admin/PageHeader";
import { RecapTool } from "@/components/admin/recap/RecapTool";

export default function AutomatedRecapPage() {
  return (
    <div className="flex flex-col gap-6 p-4 sm:p-6">
      <PageHeader
        title="Automated Recap"
        description="Upload file RAW & Rekap — otomatis isi Score, identitas, format tanggal, dan tandai siswa tanpa data."
      />
      <RecapTool />
    </div>
  );
}
