"use client";

import { useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { ChatInput } from "./ChatInput";
import { ChatMessageList } from "./ChatMessageList";

interface SessionChatProps {
  sessionId: string;
}

export function SessionChat({ sessionId }: SessionChatProps) {
  const sessionQuery = trpc.session.get.useQuery({ id: sessionId });

  const messages = useMemo(() => sessionQuery.data?.messages ?? [], [sessionQuery.data]);

  return (
    <div className="space-y-6">
      <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm shadow-slate-900/5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm uppercase tracking-[0.3em] text-indigo-600">Live chat</p>
            <h2 className="mt-3 text-2xl font-semibold text-slate-950">Ask questions, get Socratic guidance.</h2>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              This chat session lets you ask follow-up questions, receive guided responses, and deepen your reasoning step by step.
            </p>
          </div>
          <div className="rounded-3xl bg-slate-50 px-4 py-3 text-sm text-slate-700">
            <p className="font-semibold">Topic</p>
            <p>{sessionQuery.data?.topic ?? "Loading…"}</p>
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <div className="rounded-[2rem] border border-slate-200 bg-slate-50 p-6">
          {sessionQuery.isLoading ? (
            <p className="text-sm text-slate-500">Loading session chat…</p>
          ) : sessionQuery.isError ? (
            <p className="text-sm text-red-600">Unable to load session. Please refresh.</p>
          ) : (
            <ChatMessageList messages={messages} />
          )}
        </div>

        <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm shadow-slate-900/5">
          <ChatInput sessionId={sessionId} onMessageSent={() => sessionQuery.refetch()} />
          <p className="mt-3 text-xs text-slate-500">
            Type your question, send it, and let the Socratic assistant reply with a guided answer. Each session is stored so you can return later.
          </p>
        </div>
      </div>
    </div>
  );
}
