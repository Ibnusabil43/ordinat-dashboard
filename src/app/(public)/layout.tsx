import Link from "next/link";

/**
 * Shell for every public page (/ and /sekolah/[slug]). Sticky header with the
 * only entry point into /admin — see DESIGN.md §6 "Public shell". Scoped to
 * this route group so /admin/* (which has its own shell, or none for login)
 * never inherits it.
 */
export default function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col bg-zinc-50">
      <header className="sticky top-0 z-40 border-b border-zinc-200 bg-white/80 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4 sm:px-6">
          <Link href="/" className="text-lg font-bold tracking-tight text-zinc-900">
            Ordinat
          </Link>
          <Link
            href="/admin/login"
            className="text-sm font-medium text-zinc-500 transition hover:text-zinc-900"
          >
            Masuk
          </Link>
        </div>
      </header>

      <main className="flex-1">
        <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">{children}</div>
      </main>

      <footer className="border-t border-zinc-200 py-6">
        <div className="mx-auto max-w-6xl px-4 text-center text-xs text-zinc-500 sm:px-6">
          Ordinat Dashboard — jadwal &amp; link psikotes sekolah.
        </div>
      </footer>
    </div>
  );
}
