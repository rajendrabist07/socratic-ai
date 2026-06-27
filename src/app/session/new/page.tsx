"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { trpc } from "@/lib/trpc";
import { toFriendlyErrorMessage } from "@/lib/errors";

export default function NewSessionPage() {
  const router = useRouter();
  const create = trpc.session.create.useMutation({
    onSuccess: (data) => {
      router.push(`/session/${data.id}`);
    },
  });

  const [title, setTitle] = useState("");
  const [topic, setTopic] = useState("");
  const [isTakingLonger, setIsTakingLonger] = useState(false);

  useEffect(() => {
    if (!create.isPending) {
      setIsTakingLonger(false);
      return;
    }

    const timeout = window.setTimeout(() => {
      setIsTakingLonger(true);
    }, 15_000);

    return () => window.clearTimeout(timeout);
  }, [create.isPending]);

  return (
    <main className="flex min-h-[calc(100vh-6rem)] items-center justify-center py-10">
      <div className="w-full max-w-2xl rounded-2xl border border-border bg-surface p-6 shadow-soft sm:rounded-[2rem] sm:p-10">
        <div className="mb-8">
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-accent">New session</p>
          <h1 className="mt-4 text-3xl font-semibold text-foreground">Start a fresh Socratic conversation</h1>
          <p className="mt-3 text-sm leading-6 text-muted">Give your session a title, choose a topic, and begin exploring with questions.</p>
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            create.mutate({ title, topic });
          }}
          className="space-y-6"
        >
          <div>
            <label className="mb-2 block text-sm font-medium text-foreground">Session title</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full rounded-3xl border border-border bg-background/70 px-4 py-3 text-sm text-foreground outline-none transition placeholder:text-muted/70 focus:border-accent/60 focus:ring-2 focus:ring-accent/20"
              placeholder="E.g. Philosophy study session"
              required
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-foreground">Topic</label>
            <input
              type="text"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              className="w-full rounded-3xl border border-border bg-background/70 px-4 py-3 text-sm text-foreground outline-none transition placeholder:text-muted/70 focus:border-accent/60 focus:ring-2 focus:ring-accent/20"
              placeholder="E.g. Critical thinking, science, literature"
              required
            />
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <button
              type="submit"
              className="inline-flex items-center justify-center rounded-full bg-accent px-6 py-3 text-sm font-semibold text-white shadow-glow transition hover:bg-indigo-500 active:scale-95 disabled:cursor-not-allowed disabled:opacity-50"
              disabled={create.isPending}
            >
              {create.isPending ? "Creating…" : "Create Session"}
            </button>
            <p className="text-sm leading-6 text-muted">
              Keep the title short and descriptive so you can find this session later.
            </p>
          </div>

          {isTakingLonger ? (
            <p className="rounded-2xl border border-border bg-surface-elevated px-4 py-3 text-sm text-muted">
              This is taking longer than usual...
            </p>
          ) : null}

          {create.error ? (
            <div className="rounded-2xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-700 dark:text-red-200">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <p>
                  {toFriendlyErrorMessage(
                    create.error,
                    "Unable to create session. Please try again.",
                  )}
                </p>
                <button
                  type="button"
                  onClick={() => create.reset()}
                  className="rounded-full bg-red-500/15 px-3 py-1.5 text-xs font-semibold transition hover:bg-red-500/25 active:scale-95"
                >
                  Dismiss
                </button>
              </div>
            </div>
          ) : null}
        </form>
      </div>
    </main>
  );
}
