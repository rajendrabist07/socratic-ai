"use client";

import { useState } from "react";
import { trpc } from "@/lib/trpc";

interface ChatInputProps {
  sessionId: string;
  onMessageSent?: () => void;
}

type ChatMode = "ask" | "answer";

const MODE_OPTIONS: Array<{ value: ChatMode; label: string; description: string }> = [
  {
    value: "ask",
    label: "Guide",
    description: "Socratic question mode for deeper reasoning.",
  },
  {
    value: "answer",
    label: "Explain",
    description: "Direct answer with a follow-up question.",
  },
];

export function ChatInput({ sessionId, onMessageSent }: ChatInputProps) {
  const [value, setValue] = useState("");
  const [mode, setMode] = useState<ChatMode>("ask");
  const [followUpHints, setFollowUpHints] = useState<string[]>([]);

  const sendMessage = trpc.chat.sendMessage.useMutation({
    onSuccess: (data) => {
      setValue("");
      setFollowUpHints(data?.followUpHints ?? []);
      onMessageSent?.();
    },
  });

  const handleSubmit = () => {
    const trimmed = value.trim();
    if (!trimmed || sendMessage.isPending) return;
    sendMessage.mutate({ sessionId, content: trimmed, mode });
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap gap-2">
          {MODE_OPTIONS.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => {
                setMode(option.value);
                setFollowUpHints([]);
              }}
              className={`rounded-full border px-4 py-2 text-sm font-medium transition ${
                mode === option.value
                  ? "border-indigo-600 bg-indigo-600 text-white"
                  : "border-slate-200 bg-white text-slate-700 hover:border-slate-300"
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>
        <p className="max-w-2xl text-xs text-slate-500 sm:text-right">
          {MODE_OPTIONS.find((option) => option.value === mode)?.description}
        </p>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row">
        <input
          type="text"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleSubmit()}
          placeholder="Ask your question here…"
          disabled={sendMessage.isPending}
          className="flex-1 rounded-3xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
        />
        <button
          onClick={handleSubmit}
          disabled={sendMessage.isPending || !value.trim()}
          className="rounded-full bg-indigo-600 px-6 py-3 text-sm font-semibold text-white shadow transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {sendMessage.isPending ? "Thinking…" : mode === "answer" ? "Explain" : "Ask"}
        </button>
      </div>

      {followUpHints.length > 0 ? (
        <div className="rounded-3xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
          <p className="font-semibold text-slate-900">Follow-up suggestions</p>
          <ul className="mt-2 space-y-2 list-disc pl-5">
            {followUpHints.map((hint, index) => (
              <li key={index}>{hint}</li>
            ))}
          </ul>
        </div>
      ) : null}

      {sendMessage.error ? (
        <p className="text-sm text-red-600">
          {sendMessage.error.message || "Unable to send your message. Please try again."}
        </p>
      ) : null}
    </div>
  );
}
