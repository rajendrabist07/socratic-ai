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
        include: { _count: { select: { messages: true } } },
      })
    : [];
  const firstName = user?.firstName ?? "there";
  const imageUrl = user?.imageUrl;

  return (
    <main className="space-y-6 sm:space-y-8">
      <section className="overflow-hidden rounded-2xl border border-border bg-surface p-5 shadow-soft sm:rounded-[2rem] sm:p-8">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex min-w-0 items-center gap-4 sm:gap-5">
            {imageUrl ? (
              <img
                src={imageUrl}
                alt={`${firstName}'s profile`}
                loading="lazy"
                referrerPolicy="no-referrer"
                className="h-16 w-16 shrink-0 rounded-full border border-border object-cover ring-2 ring-accent/40 ring-offset-4 ring-offset-surface sm:h-20 sm:w-20"
              />
            ) : (
              <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full border border-border bg-surface-elevated text-xl font-semibold text-foreground ring-2 ring-accent/40 ring-offset-4 ring-offset-surface sm:h-20 sm:w-20">
                {firstName.slice(0, 1).toUpperCase()}
              </div>
            )}
            <div className="min-w-0">
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-accent">
                Dashboard
              </p>
              <h1 className="mt-3 truncate text-2xl font-semibold text-foreground sm:text-4xl">
                Welcome back, {firstName}
              </h1>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-muted sm:text-base">
                Keep your questions, reflections, and learning sessions organized in one place.
              </p>
            </div>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row lg:flex-col lg:items-end">
            <div className="rounded-2xl border border-border bg-surface-elevated px-5 py-4">
              <p className="text-3xl font-semibold text-foreground">{sessions.length}</p>
              <p className="mt-1 text-sm text-muted">Total sessions</p>
            </div>
            <Link
              href="/session/new"
              className="inline-flex items-center justify-center rounded-full bg-accent px-6 py-3 text-sm font-semibold text-white shadow-glow transition hover:bg-indigo-500 active:scale-95"
            >
              New Session
            </Link>
          </div>
        </div>
      </section>

      <section className="grid gap-6">
        {sessions.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border bg-surface/70 p-8 text-center shadow-soft sm:rounded-[2rem] sm:p-10">
            <p className="text-lg font-medium text-foreground">No sessions yet.</p>
            <p className="mt-2 text-sm leading-6 text-muted">
              Create a session and start learning through smart questions.
            </p>
            <Link
              href="/session/new"
              className="mt-6 inline-flex rounded-full bg-accent px-5 py-2.5 text-sm font-semibold text-white shadow-glow transition hover:bg-indigo-500 active:scale-95"
            >
              Create your first session
            </Link>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {sessions.map((s) => (
              <article
                key={s.id}
                className="group overflow-hidden rounded-2xl border border-border bg-surface p-5 shadow-soft transition duration-200 hover:scale-[1.02] hover:border-accent/30 sm:p-6"
              >
                <Link
                  href={`/session/${s.id}`}
                  className="line-clamp-2 text-lg font-semibold text-foreground transition group-hover:text-accent"
                >
                  {s.title}
                </Link>
                <p className="mt-3 line-clamp-3 text-sm leading-6 text-muted">{s.topic}</p>
                <div className="mt-6 flex items-center justify-between gap-3 text-xs text-muted">
                  <span>{s._count.messages} messages</span>
                  <span>
                    {new Date(s.updatedAt).toLocaleDateString(undefined, {
                      month: "short",
                      day: "numeric",
                    })}
                  </span>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
