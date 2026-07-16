import { Skeleton } from "@/components/Skeleton";

/** Shape matches AgendaPage: header + 3 sections of a few rows each. */
export default function AgendaLoading() {
  return (
    <div className="flex flex-col gap-8 p-4 sm:p-6">
      <div className="flex flex-col gap-2">
        <Skeleton className="h-8 w-32" />
        <Skeleton className="h-4 w-64" />
      </div>

      {Array.from({ length: 3 }).map((_, section) => (
        <div key={section} className="flex flex-col gap-3">
          <Skeleton className="h-4 w-24" />
          <div className="flex flex-col gap-2">
            {Array.from({ length: 2 }).map((_, row) => (
              <Skeleton key={row} className="h-[72px] rounded-2xl" />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
