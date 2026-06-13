"use client";

import { useEffect, useMemo, useState } from "react";
import { trpc } from "@/lib/trpc";
import { ChatInput } from "./ChatInput";
import {
  ChatMessageList,
  type ChatDisplayMessage,
} from "./ChatMessageList";
import { ThinkingMap } from "@/components/thinking-map/ThinkingMap";
import type { ThinkingMapData } from "@/server/ai/analysis";

interface SessionChatProps {
  sessionId: string;
}

export function SessionChat({ sessionId }: SessionChatProps) {
  const sessionQuery = trpc.session.get.useQuery({ id: sessionId });
  const [optimisticMessages, setOptimisticMessages] = useState<
    ChatDisplayMessage[]
  >([]);
  const [isWaitingForFirstToken, setIsWaitingForFirstToken] = useState(false);

  const generateThinkingMap = trpc.session.generateThinkingMap.useMutation({
    onSuccess: () => {
      void sessionQuery.refetch();
    },
  });

  useEffect(() => {
    setOptimisticMessages(sessionQuery.data?.messages ?? []);
  }, [sessionQuery.data?.messages]);

  const thinkingMap = useMemo(() => {
    const raw = sessionQuery.data?.thinkingMap;
    return isThinkingMapData(raw) ? raw : null;
  }, [sessionQuery.data?.thinkingMap]);

  const messages = useMemo(() => optimisticMessages, [optimisticMessages]);

  const handleUserMessage = (content: string) => {
    setOptimisticMessages((current) => [
      ...current,
      {
        id: `local-user-${Date.now()}`,
        role: "USER",
        content,
        thinking: null,
      },
    ]);
  };

  const handleAssistantStart = () => {
    setIsWaitingForFirstToken(true);
    setOptimisticMessages((current) => [
      ...current,
      {
        id: "local-assistant-streaming",
        role: "ASSISTANT",
        content: "",
        thinking: null,
      },
    ]);
  };

  const handleAssistantToken = (token: string) => {
    setIsWaitingForFirstToken(false);
    setOptimisticMessages((current) =>
      current.map((message) =>
        message.id === "local-assistant-streaming"
          ? { ...message, content: `${message.content}${token}` }
          : message,
      ),
    );
  };

  const handleRefresh = () => {
    setIsWaitingForFirstToken(false);
    void sessionQuery.refetch();
  };

  const handleEndSession = () => {
    generateThinkingMap.mutate({ id: sessionId });
  };

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm shadow-slate-900/5 sm:rounded-[2rem] sm:p-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <p className="text-sm uppercase tracking-[0.2em] text-indigo-600 sm:tracking-[0.3em]">Live chat</p>
            <h2 className="mt-3 text-xl font-semibold text-slate-950 sm:text-2xl">Ask questions, get Socratic guidance.</h2>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              The assistant responds with one guiding question that targets your current reasoning.
            </p>
          </div>
          <div className="rounded-2xl bg-slate-50 px-4 py-3 text-sm text-slate-700 sm:rounded-3xl">
            <p className="font-semibold">Topic</p>
            <p className="break-words">{sessionQuery.data?.topic ?? "Loading..."}</p>
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3 sm:rounded-[2rem] sm:p-6">
          {sessionQuery.isLoading ? (
            <p className="text-sm text-slate-500">Loading session chat...</p>
          ) : sessionQuery.isError ? (
            <p className="text-sm text-red-600">Unable to load session. Please refresh.</p>
          ) : (
            <ChatMessageList
              messages={messages}
              isThinking={isWaitingForFirstToken}
            />
          )}
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm shadow-slate-900/5 sm:rounded-[2rem] sm:p-6">
          <ChatInput
            sessionId={sessionId}
            onUserMessage={handleUserMessage}
            onAssistantStart={handleAssistantStart}
            onAssistantToken={handleAssistantToken}
            onMessageSent={handleRefresh}
          />
          <p className="mt-3 text-xs text-slate-500">
            Each response is intentionally limited to one guiding question.
          </p>
        </div>

        <div className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm shadow-slate-900/5 sm:flex-row sm:items-center sm:justify-between sm:rounded-[2rem] sm:p-6">
          <div>
            <h3 className="text-base font-semibold text-slate-950">Session wrap-up</h3>
            <p className="mt-1 text-sm text-slate-500">
              Generate a Thinking Map from this conversation.
            </p>
          </div>
          <button
            type="button"
            onClick={handleEndSession}
            disabled={generateThinkingMap.isPending || messages.length === 0}
            className="inline-flex items-center justify-center rounded-full bg-slate-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {generateThinkingMap.isPending ? "Generating..." : "End Session"}
          </button>
        </div>

        {generateThinkingMap.error ? (
          <p className="text-sm text-red-600">
            {generateThinkingMap.error.message || "Unable to generate Thinking Map."}
          </p>
        ) : null}

        {thinkingMap ? <ThinkingMap data={thinkingMap} /> : null}
      </div>
    </div>
  );
}

function isThinkingMapData(value: unknown): value is ThinkingMapData {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return false;
  }

  const data = value as Record<string, unknown>;

  return (
    typeof data.summary === "string" &&
    typeof data.keyInsight === "string" &&
    Array.isArray(data.misconceptions) &&
    data.misconceptions.every((item) => typeof item === "string") &&
    Array.isArray(data.scoreTimeline) &&
    data.scoreTimeline.every((item) => typeof item === "number")
  );
}
