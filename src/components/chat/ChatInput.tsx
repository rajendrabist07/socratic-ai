"use client";

import { useState } from "react";
import { trpc } from "@/lib/trpc";

interface ChatInputProps {
  sessionId: string;
  onMessageSent?: () => void;
}

export function ChatInput({ sessionId, onMessageSent }: ChatInputProps) {
  const [value, setValue] = useState("");

  const sendMessage = trpc.chat.sendMessage.useMutation({
    onSuccess: () => {
      setValue("");
      onMessageSent?.();
    },
  });

  const handleSubmit = () => {
    const trimmed = value.trim();
    if (!trimmed || sendMessage.isPending) return;
    sendMessage.mutate({ sessionId, content: trimmed });
  };

  return (
    <div className="flex gap-2">
      <input
        type="text"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
        placeholder="Share your thoughts…"
        disabled={sendMessage.isPending}
        className="flex-1 rounded border px-3 py-2 text-sm"
      />
      <button
        onClick={handleSubmit}
        disabled={sendMessage.isPending || !value.trim()}
        className="rounded bg-indigo-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
      >
        {sendMessage.isPending ? "Thinking…" : "Send"}
      </button>
    </div>
  );
}
