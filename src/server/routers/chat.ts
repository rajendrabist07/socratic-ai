import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { createTRPCRouter, protectedProcedure } from "@/server/trpc";
import { askSocratic, trimHistory, type ChatMessage } from "@/server/ai/groq-client";

export const chatRouter = createTRPCRouter({
  sendMessage: protectedProcedure
    .input(
      z.object({
        sessionId: z.string().min(1), // MongoDB ObjectId
        content: z.string().min(1).max(4000),
        mode: z.enum(["ask", "answer"]).default("ask"),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      // 1. Verify session belongs to this user
      const user = await ctx.db.user.findUnique({
        where: { clerkId: ctx.clerkUserId },
      });
      if (!user) throw new TRPCError({ code: "NOT_FOUND" });

      const session = await ctx.db.session.findFirst({
        where: { id: input.sessionId, userId: user.id },
        include: {
          messages: { orderBy: { createdAt: "asc" } },
        },
      });
      if (!session) throw new TRPCError({ code: "NOT_FOUND" });

      // 2. Persist user message
      await ctx.db.message.create({
        data: {
          sessionId: session.id,
          role: "USER",
          content: input.content,
        },
      });

      // 3. Build history for Groq
      const history: ChatMessage[] = session.messages.map((m) => ({
        role: m.role === "USER" ? "user" : "assistant",
        content: m.content,
      }));

      const trimmed = trimHistory(history);

      // 4. Call Groq
      const response = await askSocratic(trimmed, input.content, input.mode);

      const assistantContent =
        input.mode === "answer"
          ? [response.answer ?? response.question, response.question]
              .filter(Boolean)
              .join("\n\n")
          : response.question;

      // 5. Persist assistant message (question only — not the internal thinking)
      const assistantMessage = await ctx.db.message.create({
        data: {
          sessionId: session.id,
          role: "ASSISTANT",
          content: assistantContent,
          thinking: response.thinking,
        },
      });

      return {
        message: assistantMessage,
        followUpHints: response.followUpHints,
      };
    }),
});
