"use client";

import { useEffect, useState } from "react";
import { trpc } from "@/lib/trpc";
import { toFriendlyErrorMessage } from "@/lib/errors";

interface ChatInputProps {
  sessionId: string;
  onUserMessage?: (content: string) => void;
  onAssistantToken?: (token: string) => void;
  onAssistantStart?: () => void;
  onMessageSent?: () => void;
}

export function ChatInput({
  sessionId,
  onUserMessage,
  onAssistantToken,
  onAssistantStart,
  onMessageSent,
}: ChatInputProps) {
  const [value, setValue] = useState("");
  const [streamError, setStreamError] = useState<string | null>(null);
  const [lastFailedMessage, setLastFailedMessage] = useState<string | null>(null);
  const [isTakingLonger, setIsTakingLonger] = useState(false);

  const sendMessage = trpc.message.send.useMutation();

  useEffect(() => {
    if (!sendMessage.isPending) {
      setIsTakingLonger(false);
      return;
    }

    const timeout = window.setTimeout(() => {
      setIsTakingLonger(true);
    }, 15_000);

    return () => window.clearTimeout(timeout);
  }, [sendMessage.isPending]);

  const sendContent = async (content: string) => {
    const trimmed = content.trim();
    if (!trimmed || sendMessage.isPending) return;

    setValue("");
    setStreamError(null);
    setLastFailedMessage(null);
    onUserMessage?.(trimmed);
    onAssistantStart?.();

    try {
      const tokenStream = await sendMessage.mutateAsync({
        sessionId,
        userContent: trimmed,
      });

      for await (const token of tokenStream) {
        onAssistantToken?.(token);
      }

      onMessageSent?.();
    } catch (error) {
      setStreamError(
        toFriendlyErrorMessage(
          error,
          "Unable to send your message. Please try again.",
        ),
      );
      setLastFailedMessage(trimmed);
      onMessageSent?.();
    }
  };

  const handleSubmit = () => {
    void sendContent(value);
  };

  const handleRetry = () => {
    if (lastFailedMessage) {
      void sendContent(lastFailedMessage);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row">
        <input
          type="text"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleSubmit()}
          placeholder="Share your question or current thinking..."
          disabled={sendMessage.isPending}
          className="min-w-0 flex-1 rounded-2xl border border-border bg-background/70 px-4 py-3 text-sm text-foreground outline-none transition placeholder:text-muted/70 focus:border-accent/60 focus:ring-2 focus:ring-accent/20 disabled:cursor-not-allowed disabled:opacity-60 sm:rounded-3xl"
        />
        <button
          onClick={handleSubmit}
          disabled={sendMessage.isPending || !value.trim()}
          className="rounded-full bg-accent px-6 py-3 text-sm font-semibold text-white shadow-glow transition hover:bg-indigo-500 active:scale-95 disabled:cursor-not-allowed disabled:opacity-50 disabled:shadow-none"
        >
          {sendMessage.isPending ? "Thinking..." : "Ask"}
        </button>
      </div>

      {streamError || sendMessage.error ? (
        <div className="rounded-2xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-700 dark:text-red-200">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p>
              {streamError ??
                toFriendlyErrorMessage(
                  sendMessage.error,
                  "Unable to send your message. Please try again.",
                )}
            </p>
            <div className="flex shrink-0 gap-2">
              {lastFailedMessage ? (
                <button
                  type="button"
                  onClick={handleRetry}
                  className="rounded-full bg-red-500/15 px-3 py-1.5 text-xs font-semibold transition hover:bg-red-500/25 active:scale-95"
                >
                  Retry
                </button>
              ) : null}
              <button
                type="button"
                onClick={() => {
                  setStreamError(null);
                  setLastFailedMessage(null);
                  sendMessage.reset();
                }}
                className="rounded-full bg-red-500/15 px-3 py-1.5 text-xs font-semibold transition hover:bg-red-500/25 active:scale-95"
              >
                Dismiss
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {isTakingLonger ? (
        <p className="rounded-2xl border border-border bg-surface-elevated px-4 py-3 text-sm text-muted">
          This is taking longer than usual...
        </p>
      ) : null}
    </div>
  );
}
