import { getSchools } from "@/lib/queries/schools";
import { SchoolGrid } from "@/components/SchoolGrid";

export default async function HomePage() {
  const schools = await getSchools();

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-zinc-900">Ordinat Dashboard</h1>
        <p className="mt-2 text-sm text-zinc-500">
          Cek jadwal psikotes, link tes, dan progress pelaksanaan untuk sekolahmu.
        </p>
      </div>
      <SchoolGrid schools={schools} />
    </div>
  );
}
