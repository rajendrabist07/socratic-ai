import Link from "next/link";

export default function HomePage() {
  return (
    <main className="min-h-screen flex flex-col justify-center py-12">
      <section className="rounded-[2rem] border border-white/10 bg-white/80 p-10 shadow-2xl shadow-slate-900/10 backdrop-blur-xl">
        <div className="grid gap-8 lg:grid-cols-[1.3fr_0.9fr] lg:items-center">
          <div>
            <span className="inline-flex items-center rounded-full bg-indigo-100 px-3 py-1 text-sm font-semibold text-indigo-700">
              Socratic learning made simple
            </span>
            <h1 className="mt-6 text-5xl font-bold tracking-tight text-slate-950 sm:text-6xl">
              Learn by asking better questions.
            </h1>
            <p className="mt-5 max-w-2xl text-lg leading-8 text-slate-600">
              SocraticAI helps you explore ideas, reflect on problems, and understand concepts deeply without giving away the answer.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link
                href="/sign-in"
                className="inline-flex items-center justify-center rounded-full bg-indigo-600 px-6 py-3 text-sm font-semibold text-white shadow hover:bg-indigo-700"
              >
                Sign in
              </Link>
              <Link
                href="/dashboard"
                className="inline-flex items-center justify-center rounded-full border border-slate-200 bg-white px-6 py-3 text-sm font-semibold text-slate-900 shadow-sm hover:bg-slate-50"
              >
                View dashboard
              </Link>
            </div>
          </div>

          <div className="rounded-[2rem] border border-slate-200 bg-slate-950/95 p-8 text-white shadow-xl shadow-slate-950/20">
            <p className="text-sm uppercase tracking-[0.25em] text-indigo-300">Start your first session</p>
            <h2 className="mt-4 text-3xl font-semibold">Ask questions — explore answers.</h2>
            <p className="mt-4 text-slate-300">
              Create a new session, invite curiosity, and let the AI guide you with follow-up questions.
            </p>
            <div className="mt-6 space-y-4 text-sm text-slate-300">
              <div className="rounded-2xl bg-slate-900/80 px-4 py-3">
                <strong className="block text-white">Track progress</strong>
                Save and return to ongoing learning sessions.
              </div>
              <div className="rounded-2xl bg-slate-900/80 px-4 py-3">
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
