import { Suspense } from "react";
import { LoginForm } from "@/components/admin/LoginForm";

/**
 * Root "/" always redirects here or away (middleware.ts, BE-K2) — v2.0 is
 * fully private, there's no public home to link back to anymore. Logo +
 * copy get a proper redesign in Phase 11 (FE-O1); this is just BE-K's
 * removal of the now-dead "Kembali ke Beranda" link.
 */
export default function LoginPage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4 bg-zinc-50 px-4">
      <div className="w-full max-w-sm">
        <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
          <div className="mb-6 text-center">
            <span className="text-xl font-bold tracking-tight text-zinc-900">Ordinat Dashboard</span>
            <p className="mt-1 text-sm text-zinc-500">Masuk untuk mengelola jadwal psikotes.</p>
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
