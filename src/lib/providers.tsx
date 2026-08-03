"use client";

import { useState } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { httpBatchStreamLink, loggerLink } from "@trpc/client";
import superjson from "superjson";
import { trpc } from "@/lib/trpc";

function getBaseUrl() {
  if (typeof window !== "undefined") return "";
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  return `http://localhost:${process.env.PORT ?? 3000}`;
}

export function TRPCProvider({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: { queries: { staleTime: 5 * 1000 } },
      }),
  );

  const [trpcClient] = useState(() =>
    trpc.createClient({
      links: [
        loggerLink({
          enabled: (op) =>
            process.env.NODE_ENV === "development" ||
            (op.direction === "down" && op.result instanceof Error),
        }),
        httpBatchStreamLink({
          transformer: superjson,
          url: "/api/trpc",
          async fetch(url, options) {
            const res = await fetch(url, { ...options, credentials: "include" });
            const contentType = res.headers.get("content-type") || "";

            // Intercept non-JSON HTML error responses (500/504 gateway timeouts) so tRPC never crashes on <!DOCTYPE
            if (contentType.includes("text/html") || (!res.ok && !contentType.includes("application/json"))) {
              let friendlyMessage = "Server connection issue. Please refresh or try again.";
              if (res.status === 504 || res.status === 502) {
                friendlyMessage = "Server response timed out. Please try again in a moment.";
              } else if (res.status === 401 || res.status === 403) {
                friendlyMessage = "Session expired. Please refresh your page or sign in again.";
              }

              const formattedJsonError = JSON.stringify([
                {
                  error: {
                    message: friendlyMessage,
                    code: -32603,
                    data: { code: "INTERNAL_SERVER_ERROR", httpStatus: res.status },
                  },
                },
              ]);

              return new Response(formattedJsonError, {
                status: 200,
                headers: { "Content-Type": "application/json" },
              });
            }

            return res;
          },
        }),
      ],
    }),
  );

  return (
    <trpc.Provider client={trpcClient} queryClient={queryClient}>
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    </trpc.Provider>
  );
}
