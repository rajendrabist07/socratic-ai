"use client";

import type { Message } from "@prisma/client";

export type ChatDisplayMessage = Pick<
  Message,
  "id" | "role" | "content" | "thinking"
>;

interface ChatMessageListProps {
  messages: ChatDisplayMessage[];
  isThinking?: boolean;
}

export function ChatMessageList({ messages, isThinking = false }: ChatMessageListProps) {
  if (messages.length === 0 && !isThinking) {
    return (
      <p className="py-10 text-center text-sm text-slate-500">
        Start by sharing what you think about the topic. SocraticAI will respond with one guiding question.
      </p>
    );
  }

  return (
    <ul className="flex flex-col gap-4">
      {messages.map((msg) => {
        const isUser = msg.role === "USER";
        const isAssistant = msg.role === "ASSISTANT";

        return (
          <li
            key={msg.id}
            className={`max-w-[92%] overflow-hidden rounded-2xl px-4 py-3 text-sm shadow-sm sm:max-w-[85%] sm:rounded-3xl sm:px-5 sm:py-4 ${
              isUser
                ? "ml-auto bg-indigo-600 text-white"
                : "bg-white text-slate-900 border border-slate-200"
            }`}
          >
            <div className="flex items-center gap-2 text-xs uppercase tracking-[0.25em] font-semibold">
              <span className={isUser ? "text-indigo-100" : "text-slate-500"}>
                {isUser ? "You" : "SocraticAI"}
              </span>
            </div>
            <p className="mt-2 whitespace-pre-line break-words leading-6">{msg.content}</p>
            {isAssistant && msg.thinking ? (
              <p className="mt-3 text-xs text-slate-500">Thoughts: {msg.thinking}</p>
            ) : null}
          </li>
        );
      })}

      {isThinking ? (
        <li className="max-w-[92%] rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm sm:max-w-[85%] sm:rounded-3xl sm:px-5 sm:py-4">
          <div className="h-3 w-24 rounded-full bg-slate-200" />
          <div className="mt-3 space-y-2">
            <div className="h-3 w-full animate-pulse rounded-full bg-slate-200" />
            <div className="h-3 w-3/4 animate-pulse rounded-full bg-slate-200" />
          </div>
        </li>
      ) : null}
    </ul>
  );
}
