import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { createTRPCRouter, protectedProcedure } from "@/server/trpc";

export const sessionRouter = createTRPCRouter({
  // List all sessions for the current user
  list: protectedProcedure.query(async ({ ctx }) => {
    const user = await ctx.db.user.findUnique({
      where: { clerkId: ctx.clerkUserId },
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
        where: { clerkId: ctx.clerkUserId },
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
      // Upsert so first session also creates the User row
      const user = await ctx.db.user.upsert({
        where: { clerkId: ctx.clerkUserId },
        update: {},
        create: {
          clerkId: ctx.clerkUserId,
          email: `${ctx.clerkUserId}@placeholder.clerk`, // replaced by webhook
        },
      });

      return ctx.db.session.create({
        data: {
          title: input.title,
          topic: input.topic,
          userId: user.id,
        },
      });
    }),

  // Archive a session
  archive: protectedProcedure
    .input(z.object({ id: z.string().min(1) })) // MongoDB ObjectId
    .mutation(async ({ ctx, input }) => {
      const user = await ctx.db.user.findUnique({
        where: { clerkId: ctx.clerkUserId },
      });
      if (!user) throw new TRPCError({ code: "NOT_FOUND" });

      return ctx.db.session.update({
        where: { id: input.id, userId: user.id },
        data: { status: "ARCHIVED" },
      });
    }),
});
