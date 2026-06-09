import { auth, currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { db } from "@/server/db/client";

export default async function DashboardPage() {
  const { userId } = await auth();

  if (!userId) redirect("/sign-in");

  const user = await currentUser();

  const dbUser = await db.user.findUnique({ where: { clerkId: userId } });
  const sessions = dbUser
    ? await db.session.findMany({
        where: { userId: dbUser.id },
        orderBy: { updatedAt: "desc" },
      })
    : [];

  return (
    <main className="space-y-8">
      <div className="rounded-[2rem] border border-slate-200 bg-white p-8 shadow-sm shadow-slate-900/5">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.3em] text-indigo-600">
              Dashboard
            </p>
            <h1 className="mt-4 text-3xl font-semibold text-slate-950">
              Welcome back{user?.firstName ? `, ${user.firstName}` : ""}!
            </h1>
            <p className="mt-3 text-slate-600 max-w-2xl">
              Keep your questions, reflections, and learning sessions organized in one place.
            </p>
          </div>
          <Link
            href="/session/new"
            className="inline-flex items-center justify-center rounded-full bg-indigo-600 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-indigo-600/10 hover:bg-indigo-700"
          >
            New Session
          </Link>
        </div>
      </div>

      <section className="grid gap-6">
        {sessions.length === 0 ? (
          <div className="rounded-[2rem] border border-dashed border-slate-300 bg-slate-50 p-10 text-center">
            <p className="text-lg font-medium text-slate-800">No sessions yet.</p>
            <p className="mt-2 text-slate-500">Create a session and start learning through smart questions.</p>
            <Link
              href="/session/new"
              className="mt-6 inline-flex rounded-full bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white shadow hover:bg-indigo-700"
            >
              Create your first session
            </Link>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            {sessions.map((s) => (
              <article
                key={s.id}
                className="overflow-hidden rounded-[1.5rem] border border-slate-200 bg-white p-6 shadow-sm transition hover:-translate-y-1 hover:shadow-md"
              >
                <Link href={`/session/${s.id}`} className="text-xl font-semibold text-slate-950 hover:text-indigo-600">
                  {s.title}
                </Link>
                <p className="mt-3 text-sm leading-6 text-slate-600">{s.topic}</p>
                <div className="mt-5 flex items-center justify-between text-xs text-slate-400">
                  <span>{new Date(s.updatedAt).toLocaleDateString()}</span>
                  <span>{new Date(s.updatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
