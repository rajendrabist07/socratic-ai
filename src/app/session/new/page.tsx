"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { trpc } from "@/lib/trpc";

export default function NewSessionPage() {
  const router = useRouter();
  const utils = trpc.useContext();
  const create = trpc.session.create.useMutation({
    onSuccess: (data) => {
      router.push(`/session/${data.id}`);
    },
  });

  const [title, setTitle] = useState("");
  const [topic, setTopic] = useState("");

  return (
    <main className="p-8">
      <div className="bg-white p-6 rounded shadow-sm max-w-2xl">
        <h1 className="text-2xl font-bold mb-4">Create New Session</h1>

        <form
        onSubmit={(e) => {
          e.preventDefault();
          create.mutate({ title, topic });
        }}
        className="space-y-4 max-w-xl"
      >
        <div>
          <label className="block text-sm font-medium mb-1">Title</label>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full rounded border px-3 py-2"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Topic</label>
          <input
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            className="w-full rounded border px-3 py-2"
            required
          />
        </div>

          <div>
            <button
              type="submit"
              className="px-4 py-2 bg-indigo-600 text-white rounded"
              disabled={create.isLoading}
            >
              {create.isLoading ? "Creating…" : "Create Session"}
            </button>
          </div>
        </form>
      </div>
    </main>
  );
}
