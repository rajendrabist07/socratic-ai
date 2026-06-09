"use client";

import type { Message } from "@prisma/client";

interface ChatMessageListProps {
  messages: Message[];
}

export function ChatMessageList({ messages }: ChatMessageListProps) {
  if (messages.length === 0) {
    return (
      <p className="py-10 text-center text-sm text-slate-500">
        Start by asking a question about your topic. SocraticAI will guide you with a thoughtful, step-by-step reply.
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
            className={`max-w-[85%] rounded-3xl px-5 py-4 text-sm shadow-sm ${
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
            <p className="mt-2 whitespace-pre-line">{msg.content}</p>
            {isAssistant && msg.thinking ? (
              <p className="mt-3 text-xs text-slate-500">Thoughts: {msg.thinking}</p>
            ) : null}
          </li>
        );
      })}
    </ul>
  );
}
