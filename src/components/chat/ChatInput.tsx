"use client";

import { useState } from "react";
import { trpc } from "@/lib/trpc";

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

  const sendMessage = trpc.message.send.useMutation();

  const handleSubmit = async () => {
    const trimmed = value.trim();
    if (!trimmed || sendMessage.isPending) return;

    setValue("");
    setStreamError(null);
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
      const message =
        error instanceof Error
          ? error.message
          : "Unable to send your message. Please try again.";
      setStreamError(message);
      onMessageSent?.();
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
          className="min-w-0 flex-1 rounded-2xl border border-border bg-background/70 px-4 py-3 text-sm text-white outline-none transition placeholder:text-zinc-600 focus:border-accent/60 focus:ring-2 focus:ring-accent/20 disabled:cursor-not-allowed disabled:opacity-60 sm:rounded-3xl"
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
        <p className="rounded-2xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-200">
          {streamError ??
            sendMessage.error?.message ??
            "Unable to send your message. Please try again."}
        </p>
      ) : null}
    </div>
  );
}
