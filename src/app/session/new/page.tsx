"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { trpc } from "@/lib/trpc";
import { toFriendlyErrorMessage } from "@/lib/errors";

function NewSessionContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialTopic = searchParams.get("topic") ?? "";

  const create = trpc.session.create.useMutation({
    onSuccess: (data) => {
      router.push(`/session/${data.id}`);
    },
  });

  const [topic, setTopic] = useState(initialTopic);
  const [title, setTitle] = useState(initialTopic);
  const [showCustomTitle, setShowCustomTitle] = useState(false);
  const [isTakingLonger, setIsTakingLonger] = useState(false);

  useEffect(() => {
    if (initialTopic) {
      setTopic(initialTopic);
      setTitle(initialTopic);
    }
  }, [initialTopic]);

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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const finalTopic = topic.trim();
    if (!finalTopic) return;
    const finalTitle = title.trim() ? title.trim() : finalTopic;
    create.mutate({ title: finalTitle, topic: finalTopic });
  };

  return (
    <div className="w-full max-w-2xl rounded-2xl border border-border bg-surface p-6 shadow-soft sm:rounded-[2rem] sm:p-10">
      <div className="mb-8">
        <span className="inline-flex items-center rounded-full border border-accent/30 bg-accent/10 px-3 py-1 text-xs font-semibold text-accent">
          🎓 Start Learning
        </span>
        <h1 className="mt-4 text-3xl font-semibold text-foreground">What topic are you studying today?</h1>
        <p className="mt-3 text-sm leading-6 text-muted">
          Enter any subject, chapter, or question. Your AI tutor will guide you step-by-step using smart questions.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label className="mb-2 block text-sm font-medium text-foreground">
            Topic or Question <span className="text-accent">*</span>
          </label>
          <input
            type="text"
            value={topic}
            onChange={(e) => {
              setTopic(e.target.value);
              if (!showCustomTitle) {
                setTitle(e.target.value);
              }
            }}
            className="w-full rounded-3xl border border-border bg-background/70 px-5 py-4 text-base text-foreground outline-none transition placeholder:text-muted/70 focus:border-accent/60 focus:ring-2 focus:ring-accent/20"
            placeholder="E.g. Calculus Limits, Quantum Physics, World War II..."
            required
            autoFocus
          />
        </div>

        {!showCustomTitle ? (
          <button
            type="button"
            onClick={() => setShowCustomTitle(true)}
            className="text-xs text-muted hover:text-accent transition underline"
          >
            + Customize session title (optional)
          </button>
        ) : (
          <div>
            <label className="mb-2 block text-sm font-medium text-foreground">Custom Title</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full rounded-3xl border border-border bg-background/70 px-4 py-3 text-sm text-foreground outline-none transition placeholder:text-muted/70 focus:border-accent/60 focus:ring-2 focus:ring-accent/20"
              placeholder="E.g. Midterm Prep - Calculus"
            />
          </div>
        )}

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between pt-2">
          <button
            type="submit"
            className="inline-flex items-center justify-center rounded-full bg-accent px-8 py-4 text-base font-semibold text-white shadow-glow transition hover:bg-indigo-500 active:scale-95 disabled:cursor-not-allowed disabled:opacity-50"
            disabled={create.isPending || !topic.trim()}
          >
            {create.isPending ? "Creating your session…" : "Start Session &rarr;"}
          </button>
          <p className="text-xs leading-5 text-muted">
            Your tutor will ask one question at a time to help you master this concept.
          </p>
        </div>

        {isTakingLonger ? (
          <p className="rounded-2xl border border-border bg-surface-elevated px-4 py-3 text-sm text-muted">
            Creating session...
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
                Try Again
              </button>
            </div>
          </div>
        ) : null}
      </form>
    </div>
  );
}

export default function NewSessionPage() {
  return (
    <main className="flex min-h-[calc(100vh-6rem)] items-center justify-center py-10">
      <Suspense fallback={
        <div className="rounded-2xl border border-border bg-surface p-8 text-center text-muted">
          Loading topic setup...
        </div>
      }>
        <NewSessionContent />
      </Suspense>
    </main>
  );
}
