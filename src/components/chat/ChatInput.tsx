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
          className="min-w-0 flex-1 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 sm:rounded-3xl"
        />
        <button
          onClick={handleSubmit}
          disabled={sendMessage.isPending || !value.trim()}
          className="rounded-full bg-indigo-600 px-6 py-3 text-sm font-semibold text-white shadow transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {sendMessage.isPending ? "Thinking..." : "Ask"}
        </button>
      </div>

      {streamError || sendMessage.error ? (
        <p className="text-sm text-red-600">
          {streamError ??
            sendMessage.error?.message ??
            "Unable to send your message. Please try again."}
        </p>
      ) : null}
    </div>
  );
}
