import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Routes that require authentication
const isProtectedRoute = createRouteMatcher([
  "/dashboard(.*)",
  "/session(.*)",
]);

// Routes that should redirect already-authenticated users away
const isAuthRoute = createRouteMatcher(["/sign-in(.*)", "/sign-up(.*)"]);

export default clerkMiddleware(async (auth, req: NextRequest) => {
  if (isProtectedRoute(req)) {
    // protect() automatically redirects to /sign-in if not authed,
    // or returns 401 for API requests
    await auth.protect();
  }

  if (isAuthRoute(req)) {
    const { userId } = await auth();
    if (userId) {
      // Already signed in — bounce to dashboard
      return NextResponse.redirect(new URL("/dashboard", req.url));
    }
  }

  return NextResponse.next();
});

export const config = {
  matcher: [
    // Skip Next.js internals and static files
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    // Always run for API routes
    "/(api|trpc)(.*)",
  ],
};
