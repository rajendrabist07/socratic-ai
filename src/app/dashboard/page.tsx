import { auth, currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { db } from "@/server/db/client";

const STARTER_TOPICS = [
  { label: "📐 Calculus Limits", topic: "Calculus Limits" },
  { label: "⚛️ Quantum Physics", topic: "Quantum Physics" },
  { label: "📈 Inflation & Money", topic: "Economics and Inflation" },
  { label: "🍎 Newton's Laws", topic: "Newton's Laws of Motion" },
];

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

  const completedCount = sessions.filter((s) => s.status === "COMPLETED").length;

  return (
    <main className="space-y-6 sm:space-y-8">
      {/* Welcome & Onboarding Banner */}
      <section className="overflow-hidden rounded-2xl border border-border bg-surface p-5 shadow-soft sm:rounded-[2rem] sm:p-8">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex min-w-0 items-center gap-4 sm:gap-5">
            {imageUrl ? (
              <Image
                src={imageUrl}
                alt={`${firstName}'s profile`}
                width={80}
                height={80}
                priority
                className="h-16 w-16 shrink-0 rounded-full border border-border object-cover ring-2 ring-accent/40 ring-offset-4 ring-offset-surface sm:h-20 sm:w-20"
              />
            ) : (
              <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full border border-border bg-surface-elevated text-xl font-semibold text-foreground ring-2 ring-accent/40 ring-offset-4 ring-offset-surface sm:h-20 sm:w-20">
                {firstName.slice(0, 1).toUpperCase()}
              </div>
            )}
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center rounded-full border border-accent/30 bg-accent/10 px-2.5 py-0.5 text-xs font-semibold text-accent">
                  💡 Socratic Mode Active
                </span>
              </div>
              <h1 className="mt-3 truncate text-2xl font-semibold text-foreground sm:text-4xl">
                Welcome, {firstName}!
              </h1>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-muted sm:text-base">
                Ready to learn? Your AI tutor asks guided questions so you discover answers yourself—building true understanding that lasts.
              </p>
            </div>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row lg:flex-col lg:items-end">
            <div className="flex gap-4 rounded-2xl border border-border bg-surface-elevated px-5 py-4">
              <div>
                <p className="text-2xl font-bold text-foreground">{sessions.length}</p>
                <p className="text-xs text-muted">Topics Explored</p>
              </div>
              <div className="border-l border-border pl-4">
                <p className="text-2xl font-bold text-emerald-500">{completedCount}</p>
                <p className="text-xs text-muted">Mastered</p>
              </div>
            </div>
            <Link
              href="/session/new"
              className="inline-flex items-center justify-center rounded-full bg-accent px-6 py-3 text-sm font-semibold text-white shadow-glow transition hover:bg-indigo-500 active:scale-95"
            >
              + Start Learning
            </Link>
          </div>
        </div>

        {/* Quick Topic Starter Pills */}
        <div className="mt-6 border-t border-border/60 pt-6">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted mb-3">
            Quick Topic Starters — Click any topic to begin:
          </p>
          <div className="flex flex-wrap gap-2">
            {STARTER_TOPICS.map((starter) => (
              <Link
                key={starter.topic}
                href={`/session/new?topic=${encodeURIComponent(starter.topic)}`}
                className="rounded-full border border-border bg-surface-elevated px-4 py-2 text-xs font-medium text-foreground transition hover:border-accent hover:bg-accent/10 hover:text-accent active:scale-95"
              >
                {starter.label}
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Sessions Grid / Empty State */}
      <section className="grid gap-6">
        {sessions.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border bg-surface/70 p-8 text-center shadow-soft sm:rounded-[2rem] sm:p-10">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-accent/10 text-2xl text-accent">
              🎓
            </div>
            <h3 className="text-xl font-semibold text-foreground">What do you want to learn today?</h3>
            <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-muted">
              Pick a quick starter topic above, or ask your first question below to start a guided learning conversation.
            </p>
            <Link
              href="/session/new"
              className="mt-6 inline-flex rounded-full bg-accent px-6 py-3 text-sm font-semibold text-white shadow-glow transition hover:bg-indigo-500 active:scale-95"
            >
              Start Learning Now
            </Link>
          </div>
        ) : (
          <div>
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-foreground">Your Learning Topics</h2>
              <span className="text-xs text-muted">{sessions.length} total</span>
            </div>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {sessions.map((s) => (
                <article
                  key={s.id}
                  className="group overflow-hidden rounded-2xl border border-border bg-surface p-5 shadow-soft transition duration-200 hover:scale-[1.02] hover:border-accent/30 sm:p-6"
                >
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <span className={`inline-flex rounded-full px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${
                      s.status === "COMPLETED" 
                        ? "bg-emerald-500/10 text-emerald-500 border border-emerald-500/20"
                        : "bg-accent/10 text-accent border border-accent/20"
                    }`}>
                      {s.status === "COMPLETED" ? "Mastered" : "In Progress"}
                    </span>
                    <span className="text-[11px] text-muted">
                      {new Date(s.updatedAt).toLocaleDateString(undefined, {
                        month: "short",
                        day: "numeric",
                      })}
                    </span>
                  </div>
                  <Link
                    href={`/session/${s.id}`}
                    className="line-clamp-2 text-lg font-semibold text-foreground transition group-hover:text-accent"
                  >
                    {s.title}
                  </Link>
                  <p className="mt-2 line-clamp-2 text-sm leading-6 text-muted">{s.topic}</p>
                  <div className="mt-4 flex items-center justify-between gap-3 text-xs text-muted border-t border-border/50 pt-3">
                    <span>{s._count.messages} messages exchanged</span>
                    <span className="font-medium text-accent group-hover:underline">Continue &rarr;</span>
                  </div>
                </article>
              ))}
            </div>
          </div>
        )}
      </section>
    </main>
  );
}
