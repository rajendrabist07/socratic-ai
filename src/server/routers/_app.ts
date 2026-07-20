import { createTRPCRouter } from "@/server/trpc";
import { sessionRouter } from "@/server/routers/session";
import { messageRouter } from "@/server/routers/message";

export const appRouter = createTRPCRouter({
  session: sessionRouter,
  message: messageRouter,
});

export type AppRouter = typeof appRouter;

