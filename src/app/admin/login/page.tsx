import { Suspense } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { LoginForm } from "@/components/admin/LoginForm";

export default function LoginPage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4 bg-zinc-50 px-4">
      <div className="w-full max-w-sm">
        <Link
          href="/"
          className="mb-4 flex w-fit items-center gap-1.5 text-sm text-zinc-500 transition hover:text-zinc-900"
        >
          <ArrowLeft aria-hidden="true" size={16} />
          Kembali ke Beranda
        </Link>

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
