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
import { toFriendlyErrorMessage } from "@/lib/errors";

interface SessionChatProps {
  sessionId: string;
}

export function SessionChat({ sessionId }: SessionChatProps) {
  const sessionQuery = trpc.session.get.useQuery({ id: sessionId });
  const [optimisticMessages, setOptimisticMessages] = useState<
    ChatDisplayMessage[]
  >([]);
  const [isWaitingForFirstToken, setIsWaitingForFirstToken] = useState(false);
  const [showSessionError, setShowSessionError] = useState(true);
  const [showThinkingMapError, setShowThinkingMapError] = useState(true);
  const [isSessionTakingLonger, setIsSessionTakingLonger] = useState(false);
  const [isThinkingMapTakingLonger, setIsThinkingMapTakingLonger] =
    useState(false);

  const generateThinkingMap = trpc.session.generateThinkingMap.useMutation({
    onSuccess: () => {
      void sessionQuery.refetch();
    },
  });

  useEffect(() => {
    setOptimisticMessages(sessionQuery.data?.messages ?? []);
  }, [sessionQuery.data?.messages]);

  useEffect(() => {
    if (!sessionQuery.isLoading && !sessionQuery.isFetching) {
      setIsSessionTakingLonger(false);
      return;
    }

    const timeout = window.setTimeout(() => {
      setIsSessionTakingLonger(true);
    }, 15_000);

    return () => window.clearTimeout(timeout);
  }, [sessionQuery.isFetching, sessionQuery.isLoading]);

  useEffect(() => {
    if (!generateThinkingMap.isPending) {
      setIsThinkingMapTakingLonger(false);
      return;
    }

    const timeout = window.setTimeout(() => {
      setIsThinkingMapTakingLonger(true);
    }, 15_000);

    return () => window.clearTimeout(timeout);
  }, [generateThinkingMap.isPending]);

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
    setShowThinkingMapError(true);
    generateThinkingMap.mutate({ id: sessionId });
  };

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-border bg-surface p-4 shadow-soft sm:rounded-[2rem] sm:p-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-accent sm:tracking-[0.3em]">Live chat</p>
            <h2 className="mt-3 text-xl font-semibold text-foreground sm:text-2xl">Ask questions, get Socratic guidance.</h2>
            <p className="mt-2 text-sm leading-6 text-muted">
              The assistant responds with one guiding question that targets your current reasoning.
            </p>
          </div>
          <div className="rounded-2xl border border-border bg-surface-elevated px-4 py-3 text-sm text-foreground sm:max-w-xs sm:rounded-3xl">
            <p className="font-semibold text-foreground">Topic</p>
            <p className="break-words">{sessionQuery.data?.topic ?? "Loading..."}</p>
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <div className="min-h-[320px] rounded-2xl border border-border bg-background/70 p-3 shadow-inner shadow-black/20 sm:rounded-[2rem] sm:p-6">
          {sessionQuery.isLoading ? (
            <div className="space-y-4">
              <div className="h-16 w-4/5 animate-pulse rounded-2xl bg-surface-elevated" />
              <div className="ml-auto h-16 w-3/4 animate-pulse rounded-2xl bg-accent/20" />
              <div className="h-20 w-5/6 animate-pulse rounded-2xl bg-surface-elevated" />
            </div>
          ) : sessionQuery.isError && showSessionError ? (
            <div className="rounded-2xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-700 dark:text-red-200">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <p>Unable to load session. Please refresh.</p>
                <button
                  type="button"
                  onClick={() => setShowSessionError(false)}
                  className="rounded-full bg-red-500/15 px-3 py-1.5 text-xs font-semibold transition hover:bg-red-500/25 active:scale-95"
                >
                  Dismiss
                </button>
              </div>
            </div>
          ) : (
            <ChatMessageList
              messages={messages}
              isThinking={isWaitingForFirstToken}
            />
          )}
        </div>

        <div className="rounded-2xl border border-border bg-surface p-4 shadow-soft sm:rounded-[2rem] sm:p-6">
          <ChatInput
            sessionId={sessionId}
            onUserMessage={handleUserMessage}
            onAssistantStart={handleAssistantStart}
            onAssistantToken={handleAssistantToken}
            onMessageSent={handleRefresh}
          />
          <p className="mt-3 text-xs text-muted">
            Each response is intentionally limited to one guiding question.
          </p>
        </div>

        {isSessionTakingLonger || isThinkingMapTakingLonger ? (
          <p className="rounded-2xl border border-border bg-surface-elevated px-4 py-3 text-sm text-muted">
            This is taking longer than usual...
          </p>
        ) : null}

        <div className="flex flex-col gap-3 rounded-2xl border border-border bg-surface p-4 shadow-soft sm:flex-row sm:items-center sm:justify-between sm:rounded-[2rem] sm:p-6">
          <div>
            <h3 className="text-base font-semibold text-foreground">Session wrap-up</h3>
            <p className="mt-1 text-sm text-muted">
              Generate a Thinking Map from this conversation.
            </p>
          </div>
          <button
            type="button"
            onClick={handleEndSession}
            disabled={generateThinkingMap.isPending || messages.length === 0}
            className="inline-flex items-center justify-center rounded-full border border-border bg-foreground px-5 py-3 text-sm font-semibold text-background transition hover:opacity-90 active:scale-95 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {generateThinkingMap.isPending ? "Generating..." : "End Session"}
          </button>
        </div>

        {generateThinkingMap.error && showThinkingMapError ? (
          <div className="rounded-2xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-700 dark:text-red-200">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <p>
                {toFriendlyErrorMessage(
                  generateThinkingMap.error,
                  "Unable to generate Thinking Map. Please try again.",
                )}
              </p>
              <button
                type="button"
                onClick={() => {
                  setShowThinkingMapError(false);
                  generateThinkingMap.reset();
                }}
                className="rounded-full bg-red-500/15 px-3 py-1.5 text-xs font-semibold transition hover:bg-red-500/25 active:scale-95"
              >
                Dismiss
              </button>
            </div>
          </div>
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
