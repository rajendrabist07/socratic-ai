"use client";

import type { Message } from "@prisma/client";

interface ChatMessageListProps {
  messages: Message[];
}

export function ChatMessageList({ messages }: ChatMessageListProps) {
  if (messages.length === 0) {
    return (
      <p className="py-8 text-center text-sm text-gray-400">
        Start by describing what you're trying to understand.
      </p>
    );
  }

  return (
    <ul className="flex flex-col gap-4">
      {messages.map((msg) => (
        <li
          key={msg.id}
          className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm ${
            msg.role === "USER"
              ? "ml-auto bg-indigo-600 text-white"
              : "bg-gray-100 text-gray-800"
          }`}
        >
          {msg.content}
        </li>
      ))}
    </ul>
  );
}
