import { createTRPCRouter } from "@/server/trpc";
import { sessionRouter } from "@/server/routers/session";
import { chatRouter } from "@/server/routers/chat";
import { messageRouter } from "@/server/routers/message";

export const appRouter = createTRPCRouter({
  session: sessionRouter,
  chat: chatRouter,
  message: messageRouter,
});

export type AppRouter = typeof appRouter;
