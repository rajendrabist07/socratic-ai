import { z } from "zod";
import type { Prisma } from "@prisma/client";
import { TRPCError } from "@trpc/server";
import { generateThinkingMap, type ThinkingMapData } from "@/server/ai/analysis";
import { logger } from "@/lib/logger";
import { sessionRateLimit } from "@/lib/rate-limit";
import { createTRPCRouter, protectedProcedure } from "@/server/trpc";

const NOT_ENOUGH_CONVERSATION_THINKING_MAP: ThinkingMapData = {
  summary: "Not enough conversation to generate insights yet.",
  keyInsight: "Try asking a few more questions first.",
  misconceptions: [],
  scoreTimeline: [],
};

export const sessionRouter = createTRPCRouter({
  // List all sessions for the current user
  list: protectedProcedure.query(async ({ ctx }) => {
    const user = await ctx.db.user.findUnique({
      where: { clerkId: ctx.userId },
    });

    if (!user) throw new TRPCError({ code: "NOT_FOUND", message: "User not found" });

    return ctx.db.session.findMany({
      where: { userId: user.id },
      orderBy: { updatedAt: "desc" },
      include: { _count: { select: { messages: true } } },
    });
  }),

  // Get a single session with messages
  get: protectedProcedure
    .input(z.object({ id: z.string().min(1) })) // MongoDB ObjectId
    .query(async ({ ctx, input }) => {
      const user = await ctx.db.user.findUnique({
        where: { clerkId: ctx.userId },
      });
      if (!user) throw new TRPCError({ code: "NOT_FOUND" });

      const session = await ctx.db.session.findFirst({
        where: { id: input.id, userId: user.id },
        include: { messages: { orderBy: { createdAt: "asc" } } },
      });

      if (!session) throw new TRPCError({ code: "NOT_FOUND" });
      return session;
    }),

  // Create a new session
  create: protectedProcedure
    .input(
      z.object({
        title: z.string().min(1).max(120),
        topic: z.string().min(1).max(255),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { success, remaining } = await sessionRateLimit.limit(ctx.userId);

      if (!success) {
        logger.warn("Rate limit hit", {
          endpoint: "session.create",
          userId: ctx.userId,
          remaining,
        });

        throw new TRPCError({
          code: "TOO_MANY_REQUESTS",
          message: "You're creating sessions too fast. Please wait a moment.",
        });
      }

      // MongoDB does not enforce relational integrity, so ensure the User row exists.
      const user = await ctx.db.user.upsert({
        where: { clerkId: ctx.userId },
        update: {},
        create: {
          clerkId: ctx.userId,
          email: `${ctx.userId}@placeholder.clerk`, // replaced by webhook
        },
      });

      return ctx.db.session.create({
        data: {
          title: input.title,
          topic: input.topic,
          status: "ACTIVE",
          userId: user.id,
        },
      });
    }),

  // Archive a session
  archive: protectedProcedure
    .input(z.object({ id: z.string().min(1) })) // MongoDB ObjectId
    .mutation(async ({ ctx, input }) => {
      const user = await ctx.db.user.findUnique({
        where: { clerkId: ctx.userId },
      });
      if (!user) throw new TRPCError({ code: "NOT_FOUND" });

      return ctx.db.session.update({
        where: { id: input.id, userId: user.id },
        data: { status: "ARCHIVED" },
      });
    }),

  delete: protectedProcedure
    .input(z.object({ sessionId: z.string().min(1) }))
    .mutation(async ({ ctx, input }) => {
      const user = await ctx.db.user.findUnique({
        where: { clerkId: ctx.userId },
      });
      if (!user) throw new TRPCError({ code: "NOT_FOUND" });

      const session = await ctx.db.session.findFirst({
        where: { id: input.sessionId, userId: user.id },
      });

      if (!session) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Session not found" });
      }

      await ctx.db.$transaction([
        ctx.db.message.deleteMany({ where: { sessionId: input.sessionId } }),
        ctx.db.session.delete({ where: { id: input.sessionId } }),
      ]);

      return { success: true };
    }),

  generateThinkingMap: protectedProcedure
    .input(z.object({ id: z.string().min(1) }))
    .mutation(async ({ ctx, input }) => {
      const user = await ctx.db.user.findUnique({
        where: { clerkId: ctx.userId },
      });
      if (!user) throw new TRPCError({ code: "NOT_FOUND" });

      const session = await ctx.db.session.findFirst({
        where: { id: input.id, userId: user.id },
        include: { messages: { orderBy: { createdAt: "asc" } } },
      });

      if (!session) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Session not found" });
      }

      const thinkingMap =
        session.messages.length <= 1
          ? NOT_ENOUGH_CONVERSATION_THINKING_MAP
          : await generateThinkingMap(session, session.messages);

      return ctx.db.session.update({
        where: { id: session.id, userId: user.id },
        data: {
          status: "COMPLETED",
          thinkingMap: thinkingMap as unknown as Prisma.InputJsonValue,
        },
        include: { messages: { orderBy: { createdAt: "asc" } } },
      });
    }),
});
