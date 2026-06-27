import { auth } from "@clerk/nextjs/server";
import { initTRPC, TRPCError } from "@trpc/server";
import superjson from "superjson";
import { ZodError } from "zod";
import { db } from "./db/client";
import { logger } from "@/lib/logger";

// ─── Context ─────────────────────────────────────────────────────────────────

export const createTRPCContext = async (opts: { headers: Headers }) => {
  const { userId } = await auth();
  return { userId, db, headers: opts.headers };
};

export type TRPCContext = Awaited<ReturnType<typeof createTRPCContext>>;

// ─── tRPC initialisation ──────────────────────────────────────────────────────

const t = initTRPC.context<TRPCContext>().create({
  transformer: superjson,
  errorFormatter({ shape, error }) {
    logger.error("tRPC error", {
      code: error.code,
      message: error.message,
      path:
        shape.data && "path" in shape.data && typeof shape.data.path === "string"
          ? shape.data.path
          : undefined,
    });

    return {
      ...shape,
      data: {
        ...shape.data,
        zodError:
          error.cause instanceof ZodError
            ? error.cause.flatten()
            : null,
      },
    };
  },
});

// ─── Reusable middleware ──────────────────────────────────────────────────────

const enforceAuth = t.middleware(async ({ ctx, next }) => {
  if (!ctx.userId) {
    throw new TRPCError({ code: "UNAUTHORIZED" });
  }
  return next({ ctx: { ...ctx, userId: ctx.userId } });
});

// ─── Exports ──────────────────────────────────────────────────────────────────

export const createTRPCRouter = t.router;

/** Public procedure — no auth required */
export const publicProcedure = t.procedure;

/** Protected procedure — throws UNAUTHORIZED if not signed in */
export const protectedProcedure = t.procedure.use(enforceAuth);
