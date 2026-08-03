import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/server/db/client";
import { ThinkingMap } from "@/components/thinking-map/ThinkingMap";
import type { ThinkingMapData } from "@/server/ai/analysis";

interface SharePageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: SharePageProps): Promise<Metadata> {
  const { id } = await params;
  const session = await db.session.findFirst({
    where: { id, isPublic: true },
  });

  if (!session) {
    return {
      title: "Shared Session Not Found — SocraticAI",
      description: "This study session is private or does not exist.",
    };
  }

  const title = `${session.title} — Shared Socratic Session`;
  const description = `Explore this guided Socratic learning dialogue on ${session.topic}. Discover how SocraticAI helps students master concepts through reasoning.`;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: "article",
      images: ["/og-image.png"],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: ["/og-image.png"],
    },
  };
}

export default async function SharePage({ params }: SharePageProps) {
  const { id } = await params;
  const session = await db.session.findFirst({
    where: { id, isPublic: true },
    include: { messages: { orderBy: { createdAt: "asc" } } },
  });

  if (!session) {
    notFound();
  }

  const rawThinkingMap = session.thinkingMap;
  const thinkingMap: ThinkingMapData | null =
    rawThinkingMap && typeof rawThinkingMap === "object" && !Array.isArray(rawThinkingMap)
      ? (rawThinkingMap as unknown as ThinkingMapData)
      : null;

  return (
    <main className="mx-auto max-w-4xl space-y-6 py-6 sm:py-10">
      {/* Public Share Header */}
      <div className="rounded-2xl border border-border bg-surface p-5 shadow-soft sm:rounded-[2rem] sm:p-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-500">
                🌐 Public Shared Transcript
              </span>
            </div>
            <h1 className="mt-3 text-2xl font-bold text-foreground sm:text-3xl">
              {session.title}
            </h1>
            <p className="mt-2 text-sm text-muted">
              Topic: <strong className="text-foreground">{session.topic}</strong>
            </p>
          </div>
          <Link
            href="/dashboard"
            className="inline-flex items-center justify-center rounded-full bg-accent px-5 py-2.5 text-xs font-semibold text-white shadow-glow transition hover:bg-indigo-500 active:scale-95"
          >
            Try SocraticAI Free &rarr;
          </Link>
        </div>
      </div>

      {/* Messages Feed */}
      <div className="rounded-2xl border border-border bg-background/70 p-4 shadow-inner sm:rounded-[2rem] sm:p-6 space-y-4">
        {session.messages.map((m) => (
          <div
            key={m.id}
            className={`flex flex-col gap-1 ${
              m.role === "USER" ? "items-end" : "items-start"
            }`}
          >
            <div
              className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-6 shadow-soft ${
                m.role === "USER"
                  ? "bg-accent text-white rounded-br-none"
                  : "bg-surface-elevated text-foreground border border-border rounded-bl-none"
              }`}
            >
              <p className="text-[10px] font-bold uppercase tracking-wider opacity-75 mb-1">
                {m.role === "USER" ? "Student" : "Socratic Tutor"}
              </p>
              <p className="whitespace-pre-wrap">{m.content}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Learning Breakdown (if available) */}
      {thinkingMap ? (
        <ThinkingMap data={thinkingMap} />
      ) : null}

      {/* Call to Action Footer */}
      <div className="rounded-2xl border border-border bg-surface p-6 text-center shadow-soft sm:rounded-[2rem]">
        <h3 className="text-lg font-semibold text-foreground">Want to learn through guided questions?</h3>
        <p className="mt-2 text-sm text-muted">
          SocraticAI asks smart questions to help you master any subject discovery-style.
        </p>
        <Link
          href="/sign-up"
          className="mt-5 inline-flex rounded-full bg-accent px-6 py-3 text-sm font-semibold text-white shadow-glow transition hover:bg-indigo-500 active:scale-95"
        >
          Create Your Free Account &rarr;
        </Link>
      </div>
    </main>
  );
}
