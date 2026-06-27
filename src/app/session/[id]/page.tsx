import Link from "next/link";
import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { SessionChat } from "@/components/chat/SessionChat";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function SessionPage({ params }: Props) {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");

  const { id } = await params;

  return (
    <main className="space-y-8 py-6 sm:py-10">
      <div className="rounded-2xl border border-border bg-surface p-5 shadow-soft sm:rounded-[2rem] sm:p-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-accent">Socratic chat</p>
            <h1 className="mt-3 text-3xl font-semibold text-foreground">Session chat</h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-muted">
              Ask questions, review guided replies, and continue the conversation as if you were chatting with an AI study partner.
            </p>
          </div>
          <Link
            href="/dashboard"
            className="inline-flex items-center justify-center rounded-full border border-border bg-surface-elevated px-4 py-2 text-sm font-semibold text-foreground transition hover:border-accent/30 hover:bg-surface active:scale-95"
          >
            Back to dashboard
          </Link>
        </div>
      </div>

      <div className="mx-auto max-w-4xl">
        <SessionChat sessionId={id} />
      </div>
    </main>
  );
}
