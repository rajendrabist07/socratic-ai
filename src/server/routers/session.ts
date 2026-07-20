import { z } from "zod";
import type { Prisma } from "@prisma/client";
import { TRPCError } from "@trpc/server";
import { generateThinkingMap, type ThinkingMapData } from "@/server/ai/analysis";
import { logger } from "@/lib/logger";
import { sessionRateLimit, redis } from "@/lib/rate-limit";
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
    const cacheKey = `socratic:user:${ctx.userId}:sessions`;

    // 1. Check Redis Cache
    if (redis) {
      try {
        const cached = await redis.get(cacheKey) as any[] | null;
        if (cached && Array.isArray(cached)) {
          return cached.map((s) => ({
            ...s,
            createdAt: new Date(s.createdAt),
            updatedAt: new Date(s.updatedAt),
          }));
        }
      } catch (e) {
        logger.error("Redis session list read error", { userId: ctx.userId, error: String(e) });
      }
    }

    // 2. Fetch from Database
    const user = await ctx.db.user.findUnique({
      where: { clerkId: ctx.userId },
    });

    if (!user) throw new TRPCError({ code: "NOT_FOUND", message: "User not found" });

    const sessions = await ctx.db.session.findMany({
      where: { userId: user.id },
      orderBy: { updatedAt: "desc" },
      include: { _count: { select: { messages: true } } },
    });

    // 3. Save to Redis Cache (5-minute TTL)
    if (redis) {
      try {
        await redis.set(cacheKey, sessions, { ex: 300 });
      } catch (e) {
        logger.error("Redis session list write error", { userId: ctx.userId, error: String(e) });
      }
    }

    return sessions;
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

      const session = await ctx.db.session.create({
        data: {
          title: input.title,
          topic: input.topic,
          status: "ACTIVE",
          userId: user.id,
        },
      });

      await invalidateSessionCache(ctx.userId);
      return session;
    }),

  // Archive a session
  archive: protectedProcedure
    .input(z.object({ id: z.string().min(1) })) // MongoDB ObjectId
    .mutation(async ({ ctx, input }) => {
      const user = await ctx.db.user.findUnique({
        where: { clerkId: ctx.userId },
      });
      if (!user) throw new TRPCError({ code: "NOT_FOUND" });

      const session = await ctx.db.session.update({
        where: { id: input.id, userId: user.id },
        data: { status: "ARCHIVED" },
      });

      await invalidateSessionCache(ctx.userId);
      return session;
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

      await invalidateSessionCache(ctx.userId);
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

      const updatedSession = await ctx.db.session.update({
        where: { id: session.id, userId: user.id },
        data: {
          status: "COMPLETED",
          thinkingMap: thinkingMap as unknown as Prisma.InputJsonValue,
        },
        include: { messages: { orderBy: { createdAt: "asc" } } },
      });

      await invalidateSessionCache(ctx.userId);
      return updatedSession;
    }),
});

async function invalidateSessionCache(userId: string) {
  if (redis) {
    try {
      await redis.del(`socratic:user:${userId}:sessions`);
    } catch (e) {
      logger.error("Failed to invalidate session list cache", { userId, error: String(e) });
    }
  }
}
