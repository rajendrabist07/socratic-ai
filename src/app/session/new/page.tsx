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
      <div className="w-full max-w-2xl rounded-[2rem] border border-slate-200 bg-white p-10 shadow-xl shadow-slate-900/5">
        <div className="mb-8">
          <p className="text-sm uppercase tracking-[0.3em] text-indigo-600">New session</p>
          <h1 className="mt-4 text-3xl font-semibold text-slate-950">Start a fresh Socratic conversation</h1>
          <p className="mt-3 text-slate-600">Give your session a title, choose a topic, and begin exploring with questions.</p>
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            create.mutate({ title, topic });
          }}
          className="space-y-6"
        >
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Session title</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full rounded-3xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
              placeholder="E.g. Philosophy study session"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Topic</label>
            <input
              type="text"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              className="w-full rounded-3xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
              placeholder="E.g. Critical thinking, science, literature"
              required
            />
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <button
              type="submit"
              className="inline-flex items-center justify-center rounded-full bg-indigo-600 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-indigo-600/10 transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:bg-slate-300"
              disabled={create.isPending}
            >
              {create.isPending ? "Creating…" : "Create Session"}
            </button>
            <p className="text-sm text-slate-500">
              Keep the title short and descriptive so you can find this session later.
            </p>
          </div>
        </form>
      </div>
    </main>
  );
}
