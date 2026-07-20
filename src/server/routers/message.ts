import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { env } from "@/env";
import { scoreComprehension } from "@/server/ai/analysis";
import {
  groq,
  runGroqCall,
  throwFriendlyGroqError,
  trimHistory,
  type ChatMessage,
} from "@/server/ai/groq-client";
import {
  buildSocraticPrompt,
  type Message as SocraticPromptMessage,
} from "@/server/ai/socratic-prompt";
import { createTRPCRouter, protectedProcedure } from "@/server/trpc";
import type { TRPCContext } from "@/server/trpc";
import { logger } from "@/lib/logger";
import { chatRateLimit } from "@/lib/rate-limit";

type StreamChunk = {
  choices?: Array<{
    delta?: {
      content?: string | null;
    };
  }>;
};

type ProtectedContext = TRPCContext & {
  userId: string;
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

      const { success, remaining } = await chatRateLimit.limit(ctx.userId);

      if (!success) {
        logger.warn("Rate limit hit", {
          endpoint: "message.send",
          userId: ctx.userId,
          remaining,
        });

        throw new TRPCError({
          code: "TOO_MANY_REQUESTS",
          message: "You're sending messages too fast. Please wait a moment.",
        });
      }

      const duplicateMessage = await ctx.db.message.findFirst({
        where: {
          sessionId: session.id,
          role: "USER",
          content: input.userContent,
          createdAt: { gte: new Date(Date.now() - 3_000) },
        },
        orderBy: { createdAt: "desc" },
      });

      if (duplicateMessage) {
        logger.info("Duplicate user message ignored", {
          operation: "message.send",
          userId: ctx.userId,
          sessionId: session.id,
          messageId: duplicateMessage.id,
        });

        return emptyTokenStream();
      }

      const userMessage = await ctx.db.message.create({
        data: {
          sessionId: session.id,
          role: "USER",
          content: input.userContent,
        },
      });

      // Optimize: Fetch only the last 20 messages for context, keeping it bounded and fast.
      const recentMessages = await ctx.db.message.findMany({
        where: { sessionId: session.id },
        orderBy: { createdAt: "desc" },
        take: 20,
      });
      const messages = recentMessages.reverse();

      // Trigger scoring in parallel
      const scoringPromise = scoreComprehensionAndSave({
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
        const groqStream = await runGroqCall(
          {
            operation: "message.send.stream.create",
            model: env.GROQ_MODEL,
            topic: session.topic,
            userId: ctx.userId,
            sessionId: session.id,
          },
          () =>
            groq.chat.completions.create({
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
            }),
        );

        return streamTokensAndSaveAssistantMessage({
          ctx,
          sessionId: session.id,
          stream: groqStream,
          scoringPromise,
        });
      } catch (error) {
        throwFriendlyGroqError(error, {
          operation: "message.send.stream.create",
          userId: ctx.userId,
          sessionId: session.id,
        });
      }
    }),
});

async function getOwnedSession(ctx: ProtectedContext, sessionId: string) {
  const user = await ctx.db.user.findUnique({
    where: { clerkId: ctx.userId },
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
  scoringPromise,
}: {
  ctx: ProtectedContext;
  sessionId: string;
  stream: AsyncIterable<StreamChunk>;
  scoringPromise?: Promise<void>;
}): AsyncIterable<string> {
  return {
    async *[Symbol.asyncIterator]() {
      let assistantContent = "";

      try {
        for await (const chunk of stream) {
          const token = chunk.choices?.[0]?.delta?.content ?? "";

          if (!token) {
            continue;
          }

          assistantContent += token;
          yield token;
        }
      } catch (error) {
        throwFriendlyGroqError(error, {
          operation: "message.send.stream.iterate",
          userId: ctx.userId,
          sessionId,
        });
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

      // Safeguard: Await parallel scoring completion before terminating Vercel environment.
      if (scoringPromise) {
        try {
          await scoringPromise;
        } catch (error) {
          logger.error("Scoring promise failed to resolve inside stream", {
            operation: "message.send.stream.scoring",
            userId: ctx.userId,
            sessionId,
            message: error instanceof Error ? error.message : "Unknown error",
          });
        }
      }
    },
  };
}

function emptyTokenStream(): AsyncIterable<string> {
  return {
    async *[Symbol.asyncIterator]() {
      return;
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
    const { score, misconceptionTag, reasoning, confidenceLevel } = await scoreComprehension(
      topic,
      userContent,
      conversationHistory,
    );

    await ctx.db.message.update({
      where: { id: messageId },
      data: {
        comprehensionScore: score,
        misconceptionTag,
        reasoning,
        confidenceLevel,
      },
    });
  } catch (error) {
    logger.error("Comprehension scoring failed", {
      operation: "scoreComprehensionAndSave",
      userId: ctx.userId,
      messageId,
      message: error instanceof Error ? error.message : "Unknown error",
    });
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
