import { Suspense } from "react";
import { LoginForm } from "@/components/admin/LoginForm";

export default function LoginPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-zinc-50 px-4">
      <div className="w-full max-w-sm rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
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
    </main>
  );
}
