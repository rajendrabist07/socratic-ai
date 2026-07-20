import { describe, expect, it, vi } from "vitest";
import type { TRPCContext } from "@/server/trpc";
import { sessionRouter } from "./session";

vi.mock("@/lib/logger", () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

vi.mock("@/lib/rate-limit", () => ({
  sessionRateLimit: {
    limit: vi.fn().mockResolvedValue({
      success: true,
      remaining: 4,
      reset: Date.now() + 3_600_000,
    }),
  },
  redis: {
    get: vi.fn(),
    set: vi.fn(),
    del: vi.fn(),
  },
}));


vi.mock("@/server/db/client", () => ({
  db: {},
}));

vi.mock("@/server/ai/analysis", () => ({
  generateThinkingMap: vi.fn(),
}));

function createContext(userId: string | null, db: unknown): TRPCContext {
  return {
    userId,
    db,
    headers: new Headers(),
  } as unknown as TRPCContext;
}

describe("sessionRouter.create", () => {
  it("requires authentication", async () => {
    const caller = sessionRouter.createCaller(createContext(null, {}));

    await expect(
      caller.create({ title: "Calculus", topic: "Derivatives" }),
    ).rejects.toMatchObject({ code: "UNAUTHORIZED" });
  });

  it("returns an active session with valid input", async () => {
    const db = {
      user: {
        upsert: vi.fn().mockResolvedValue({ id: "db-user-1" }),
      },
      session: {
        create: vi.fn().mockResolvedValue({
          id: "session-1",
          title: "Calculus",
          topic: "Derivatives",
          status: "ACTIVE",
          userId: "db-user-1",
        }),
      },
    };
    const caller = sessionRouter.createCaller(createContext("clerk-user-1", db));

    const session = await caller.create({
      title: "Calculus",
      topic: "Derivatives",
    });

    expect(session).toMatchObject({
      id: "session-1",
      status: "ACTIVE",
      userId: "db-user-1",
    });
  });

  it("upserts the Clerk user before creating a session", async () => {
    const upsert = vi.fn().mockResolvedValue({ id: "db-user-2" });
    const create = vi.fn().mockResolvedValue({
      id: "session-2",
      title: "Physics",
      topic: "Forces",
      status: "ACTIVE",
      userId: "db-user-2",
    });
    const db = {
      user: { upsert },
      session: { create },
    };
    const caller = sessionRouter.createCaller(createContext("clerk-user-2", db));

    await caller.create({ title: "Physics", topic: "Forces" });

    expect(upsert).toHaveBeenCalledWith({
      where: { clerkId: "clerk-user-2" },
      update: {},
      create: {
        clerkId: "clerk-user-2",
        email: "clerk-user-2@placeholder.clerk",
      },
    });
    expect(create).toHaveBeenCalledWith({
      data: {
        title: "Physics",
        topic: "Forces",
        status: "ACTIVE",
        userId: "db-user-2",
      },
    });
  });
});
