import Groq from "groq-sdk";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { env } from "@/env";
import { scoreComprehension } from "@/server/ai/analysis";
import { groq, trimHistory, type ChatMessage } from "@/server/ai/groq-client";
import {
  buildSocraticPrompt,
  type Message as SocraticPromptMessage,
} from "@/server/ai/socratic-prompt";
import { createTRPCRouter, protectedProcedure } from "@/server/trpc";
import type { TRPCContext } from "@/server/trpc";

type StreamChunk = {
  choices?: Array<{
    delta?: {
      content?: string | null;
    };
  }>;
};

type ProtectedContext = TRPCContext & {
  clerkUserId: string;
};

export const messageRouter = createTRPCRouter({
  list: protectedProcedure
    .input(z.object({ sessionId: z.string().min(1) }))
    .query(async ({ ctx, input }) => {
      const session = await getOwnedSession(ctx, input.sessionId);

      return ctx.db.message.findMany({
        where: { sessionId: session.id },
        orderBy: { createdAt: "asc" },
      });
    }),

  send: protectedProcedure
    .input(
      z.object({
        sessionId: z.string().min(1),
        userContent: z.string().min(1).max(4000),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const session = await getOwnedSession(ctx, input.sessionId);

      const userMessage = await ctx.db.message.create({
        data: {
          sessionId: session.id,
          role: "USER",
          content: input.userContent,
        },
      });

      const messages = await ctx.db.message.findMany({
        where: { sessionId: session.id },
        orderBy: { createdAt: "asc" },
      });

      void scoreComprehensionAndSave({
        ctx,
        messageId: userMessage.id,
        topic: session.topic,
        userContent: input.userContent,
        conversationHistory: buildConversationHistory(messages),
      });

      const avgScore = await getAverageComprehensionScore(ctx, session.id);
      const history = trimHistory(
        messages.map((message): ChatMessage => {
          if (message.role === "SYSTEM") {
            return { role: "system", content: message.content };
          }

          return {
            role: message.role === "USER" ? "user" : "assistant",
            content: message.content,
          };
        }),
      );

      const promptMessages: SocraticPromptMessage[] = messages
        .filter((message) => message.role !== "SYSTEM")
        .map((message) => ({
          role: message.role === "USER" ? "user" : "assistant",
          content: message.content,
        }));

      try {
        const groqStream = await groq.chat.completions.create({
          model: env.GROQ_MODEL,
          messages: [
            {
              role: "system",
              content: buildSocraticPrompt(
                session.topic,
                promptMessages,
                avgScore,
              ),
            },
            ...history,
          ],
          temperature: 0.7,
          max_tokens: 100,
          stream: true,
        });

        return streamTokensAndSaveAssistantMessage({
          ctx,
          sessionId: session.id,
          stream: groqStream,
        });
      } catch (error) {
        if (isGroqRateLimitError(error)) {
          throw new TRPCError({
            code: "TOO_MANY_REQUESTS",
            message: "Too many requests, please wait a moment",
          });
        }

        throw error;
      }
    }),
});

async function getOwnedSession(ctx: ProtectedContext, sessionId: string) {
  const user = await ctx.db.user.findUnique({
    where: { clerkId: ctx.clerkUserId },
  });

  if (!user) {
    throw new TRPCError({ code: "NOT_FOUND", message: "User not found" });
  }

  const session = await ctx.db.session.findFirst({
    where: { id: sessionId, userId: user.id },
  });

  if (!session) {
    throw new TRPCError({ code: "NOT_FOUND", message: "Session not found" });
  }

  return session;
}

async function getAverageComprehensionScore(
  ctx: ProtectedContext,
  sessionId: string,
): Promise<number> {
  const aggregate = await ctx.db.message.aggregate({
    where: {
      sessionId,
      role: "USER",
      comprehensionScore: { not: null },
    },
    _avg: { comprehensionScore: true },
  });

  return aggregate._avg.comprehensionScore ?? 50;
}

function streamTokensAndSaveAssistantMessage({
  ctx,
  sessionId,
  stream,
}: {
  ctx: ProtectedContext;
  sessionId: string;
  stream: AsyncIterable<StreamChunk>;
}): AsyncIterable<string> {
  return {
    async *[Symbol.asyncIterator]() {
      let assistantContent = "";

      for await (const chunk of stream) {
        const token = chunk.choices?.[0]?.delta?.content ?? "";

        if (!token) {
          continue;
        }

        assistantContent += token;
        yield token;
      }

      const content = enforceOneVisibleQuestion(assistantContent);

      if (content.length > 0) {
        await ctx.db.message.create({
          data: {
            sessionId,
            role: "ASSISTANT",
            content,
          },
        });
      }
    },
  };
}

function buildConversationHistory(
  messages: Array<{ role: string; content: string }>,
): string {
  return messages
    .map((message) => `${message.role}: ${message.content}`)
    .join("\n")
    .slice(-6000);
}

async function scoreComprehensionAndSave({
  ctx,
  messageId,
  topic,
  userContent,
  conversationHistory,
}: {
  ctx: ProtectedContext;
  messageId: string;
  topic: string;
  userContent: string;
  conversationHistory: string;
}): Promise<void> {
  try {
    const { score, misconceptionTag } = await scoreComprehension(
      topic,
      userContent,
      conversationHistory,
    );

    await ctx.db.message.update({
      where: { id: messageId },
      data: { comprehensionScore: score, misconceptionTag },
    });
  } catch {
    // Fire-and-forget scoring must never delay or fail the streaming response.
  }
}

function enforceOneVisibleQuestion(value: string): string {
  const cleaned = value.replace(/\s+/g, " ").trim();
  const firstQuestion = cleaned.match(/[^?]*\?/u)?.[0]?.trim();
  const question = firstQuestion && firstQuestion.length > 0 ? firstQuestion : cleaned;
  const words = question.split(/\s+/).filter(Boolean);
  const capped = words.length > 80 ? `${words.slice(0, 80).join(" ")}?` : question;

  return capped.endsWith("?") ? capped : `${capped}?`;
}

function isGroqRateLimitError(error: unknown): boolean {
  return (
    error instanceof Groq.RateLimitError ||
    (typeof error === "object" &&
      error !== null &&
      "status" in error &&
      error.status === 429)
  );
}
