import Link from "next/link";

export default function HomePage() {
  return (
    <main className="flex min-h-[calc(100vh-6rem)] flex-col justify-center py-8 sm:py-12">
      <section className="rounded-2xl border border-border bg-surface p-6 shadow-soft sm:rounded-[2rem] sm:p-10">
        <div className="grid gap-8 lg:grid-cols-[1.25fr_0.95fr] lg:items-center">
          <div>
            <span className="inline-flex items-center rounded-full border border-accent/25 bg-accent/10 px-3 py-1 text-sm font-semibold text-indigo-200">
              Socratic learning made simple
            </span>
            <h1 className="mt-6 text-4xl font-semibold tracking-tight text-white sm:text-6xl">
              Learn by asking better questions.
            </h1>
            <p className="mt-5 max-w-2xl text-base leading-8 text-muted sm:text-lg">
              SocraticAI helps you explore ideas, reflect on problems, and understand concepts deeply without giving away the answer.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link
                href="/sign-in"
                className="inline-flex items-center justify-center rounded-full bg-accent px-6 py-3 text-sm font-semibold text-white shadow-glow transition hover:bg-indigo-500 active:scale-95"
              >
                Sign in
              </Link>
              <Link
                href="/dashboard"
                className="inline-flex items-center justify-center rounded-full border border-border bg-surface-elevated px-6 py-3 text-sm font-semibold text-white transition hover:border-white/20 hover:bg-zinc-800 active:scale-95"
              >
                View dashboard
              </Link>
            </div>
          </div>

          <div className="rounded-2xl border border-border bg-background p-6 text-white shadow-soft sm:rounded-[2rem] sm:p-8">
            <p className="text-xs font-semibold uppercase tracking-[0.25em] text-accent">Start your first session</p>
            <h2 className="mt-4 text-3xl font-semibold">Ask questions — explore answers.</h2>
            <p className="mt-4 text-muted">
              Create a new session, invite curiosity, and let the AI guide you with follow-up questions.
            </p>
            <div className="mt-6 space-y-4 text-sm text-muted">
              <div className="rounded-2xl border border-border bg-surface px-4 py-3">
                <strong className="block text-white">Track progress</strong>
                Save and return to ongoing learning sessions.
              </div>
              <div className="rounded-2xl border border-border bg-surface px-4 py-3">
                <strong className="block text-white">Build understanding</strong>
                Practice asking questions that uncover what matters most.
              </div>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
