import { Activity } from "lucide-react";
import { PageHeader } from "@/components/admin/PageHeader";
import { EmptyState } from "@/components/EmptyState";

/**
 * Placeholder — the real infographic + Cek Nama tool is Phase 14 (BE-M,
 * FE-P). This page exists in Phase 10 purely so TESTER's redirect target
 * (middleware.ts, BE-H4) resolves to something instead of a 404.
 */
export default function MonitoringPage() {
  return (
    <div className="flex flex-col gap-6 p-4 sm:p-6">
      <PageHeader
        title="Monitoring"
        description="Ringkasan submisi psikotes per sekolah."
      />
      <EmptyState
        icon={Activity}
        title="Belum tersedia"
        description="Dashboard monitoring sedang dibangun."
      />
    </div>
  );
}
