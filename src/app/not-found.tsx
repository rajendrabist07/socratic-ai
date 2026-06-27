import Link from "next/link";

export default function NotFound() {
  return (
    <main className="flex min-h-[70vh] items-center justify-center">
      <section className="w-full max-w-xl rounded-2xl border border-border bg-surface p-6 text-center shadow-soft sm:p-8">
        <p className="text-xs font-semibold uppercase tracking-[0.28em] text-accent">
          404
        </p>
        <h1 className="mt-4 text-3xl font-semibold text-foreground">
          Page not found
        </h1>
        <p className="mt-3 text-sm leading-6 text-muted">
          The page you are looking for does not exist or has moved.
        </p>
        <Link
          href="/dashboard"
          className="mt-6 inline-flex rounded-full bg-accent px-5 py-2.5 text-sm font-semibold text-white shadow-glow transition hover:bg-indigo-500 active:scale-95"
        >
          Back to Dashboard
        </Link>
      </section>
    </main>
  );
}
