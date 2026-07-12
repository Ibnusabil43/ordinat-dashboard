import { Suspense } from "react";
import Image from "next/image";
import { LoginForm } from "@/components/admin/LoginForm";

/**
 * Root "/" always redirects here or away (middleware.ts, BE-K2) — v2.0 is
 * fully private, there's no public home to link back to anymore, so there's
 * no back link (removed in Phase 10). Copy is role-neutral (FE-O1) since
 * this one form now serves all 3 roles, not just admins managing schedules.
 */
export default function LoginPage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4 bg-zinc-50 px-4">
      <div className="w-full max-w-sm">
        <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
          <div className="mb-6 flex flex-col items-center text-center">
            <Image src="/logo.png" alt="" width={48} height={48} className="mb-3" />
            <span className="text-xl font-bold tracking-tight text-zinc-900">Ordinat Dashboard</span>
            <p className="mt-1 text-sm text-zinc-500">Masuk untuk melanjutkan.</p>
          </div>
          {/* LoginForm reads useSearchParams (?next=) — Suspense boundary is
              required for static prerendering, otherwise the build bails. */}
          <Suspense>
            <LoginForm />
          </Suspense>
        </div>
      </div>
    </main>
  );
}
