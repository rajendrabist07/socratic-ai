"use client";

import { useEffect } from "react";

export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Route render error", {
      message: error.message,
      digest: error.digest,
    });
  }, [error]);

  return (
    <main className="flex min-h-[70vh] items-center justify-center">
      <section className="w-full max-w-xl rounded-2xl border border-border bg-surface p-6 text-center shadow-soft sm:p-8">
        <p className="text-xs font-semibold uppercase tracking-[0.28em] text-accent">
          Something went wrong
        </p>
        <h1 className="mt-4 text-3xl font-semibold text-foreground">
          This page could not be loaded.
        </h1>
        <p className="mt-3 text-sm leading-6 text-muted">
          Try again in a moment. We kept the technical details out of the page.
        </p>
        <button
          type="button"
          onClick={reset}
          className="mt-6 inline-flex rounded-full bg-accent px-5 py-2.5 text-sm font-semibold text-white shadow-glow transition hover:bg-indigo-500 active:scale-95"
        >
          Try Again
        </button>
      </section>
    </main>
  );
}
