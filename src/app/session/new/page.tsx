"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { trpc } from "@/lib/trpc";

export default function NewSessionPage() {
  const router = useRouter();
  const create = trpc.session.create.useMutation({
    onSuccess: (data) => {
      router.push(`/session/${data.id}`);
    },
  });

  const [title, setTitle] = useState("");
  const [topic, setTopic] = useState("");

  return (
    <main className="flex min-h-[calc(100vh-6rem)] items-center justify-center py-10">
      <div className="w-full max-w-2xl rounded-2xl border border-border bg-surface p-6 shadow-soft sm:rounded-[2rem] sm:p-10">
        <div className="mb-8">
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-accent">New session</p>
          <h1 className="mt-4 text-3xl font-semibold text-white">Start a fresh Socratic conversation</h1>
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
            <label className="mb-2 block text-sm font-medium text-zinc-200">Session title</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full rounded-3xl border border-border bg-background/70 px-4 py-3 text-sm text-white outline-none transition placeholder:text-zinc-600 focus:border-accent/60 focus:ring-2 focus:ring-accent/20"
              placeholder="E.g. Philosophy study session"
              required
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-zinc-200">Topic</label>
            <input
              type="text"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              className="w-full rounded-3xl border border-border bg-background/70 px-4 py-3 text-sm text-white outline-none transition placeholder:text-zinc-600 focus:border-accent/60 focus:ring-2 focus:ring-accent/20"
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
        </form>
      </div>
    </main>
  );
}
