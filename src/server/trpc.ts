import { auth } from "@clerk/nextjs/server";
import { initTRPC, TRPCError } from "@trpc/server";
import { type NextRequest } from "next/server";
import superjson from "superjson";
import { ZodError } from "zod";
import { db } from "@/server/db/client";

// ─── Context ─────────────────────────────────────────────────────────────────

interface CreateContextOptions {
  req: NextRequest;
}

export const createTRPCContext = async ({ req }: CreateContextOptions) => {
  const { userId } = await auth();

  return {
    db,
    clerkUserId: userId,
    req,
  };
};

export type TRPCContext = Awaited<ReturnType<typeof createTRPCContext>>;

// ─── tRPC initialisation ──────────────────────────────────────────────────────

const t = initTRPC.context<TRPCContext>().create({
  transformer: superjson,
  errorFormatter({ shape, error }) {
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

const enforceAuth = t.middleware(({ ctx, next }) => {
  if (!ctx.clerkUserId) {
    throw new TRPCError({ code: "UNAUTHORIZED" });
  }
  return next({ ctx: { ...ctx, clerkUserId: ctx.clerkUserId } });
});

// ─── Exports ──────────────────────────────────────────────────────────────────

export const createTRPCRouter = t.router;

/** Public procedure — no auth required */
export const publicProcedure = t.procedure;

/** Protected procedure — throws UNAUTHORIZED if not signed in */
export const protectedProcedure = t.procedure.use(enforceAuth);
