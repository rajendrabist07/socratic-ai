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
      <p className="rounded-2xl border border-dashed border-white/10 bg-surface px-5 py-10 text-center text-sm leading-6 text-muted">
        Start by sharing what you think about the topic. SocraticAI will respond with one guiding question.
      </p>
    );
  }

  return (
    <ul className="flex flex-col gap-4">
      {messages.map((msg) => {
        const isUser = msg.role === "USER";
        const isAssistant = msg.role === "ASSISTANT";

        if (isAssistant && msg.content.length === 0) {
          return null;
        }

        return (
          <li
            key={msg.id}
            className={`animate-fade-up max-w-[92%] overflow-hidden rounded-2xl px-4 py-3 text-sm shadow-lg transition sm:max-w-[82%] sm:px-5 sm:py-4 ${
              isUser
                ? "ml-auto rounded-br-md bg-accent text-white shadow-indigo-950/20"
                : "rounded-bl-md border border-border bg-surface-elevated text-zinc-100 shadow-black/20"
            }`}
          >
            <div className="flex items-center gap-2 text-[0.68rem] font-semibold uppercase tracking-[0.22em]">
              <span className={isUser ? "text-indigo-100" : "text-zinc-500"}>
                {isUser ? "You" : "SocraticAI"}
              </span>
            </div>
            <p className="mt-2 whitespace-pre-line break-words leading-6">{msg.content}</p>
            {isAssistant && msg.thinking ? (
              <p className="mt-3 border-t border-white/10 pt-3 text-xs leading-5 text-muted">
                Thoughts: {msg.thinking}
              </p>
            ) : null}
          </li>
        );
      })}

      {isThinking ? (
        <li className="animate-fade-up max-w-[92%] rounded-2xl rounded-bl-md border border-border bg-surface-elevated px-4 py-4 shadow-lg shadow-black/20 sm:max-w-[82%] sm:px-5">
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 animate-pulse rounded-full bg-zinc-400" />
            <span className="h-2 w-2 animate-pulse rounded-full bg-zinc-400 [animation-delay:120ms]" />
            <span className="h-2 w-2 animate-pulse rounded-full bg-zinc-400 [animation-delay:240ms]" />
            <span className="ml-2 text-xs font-medium text-muted">Thinking</span>
          </div>
        </li>
      ) : null}
    </ul>
  );
}
