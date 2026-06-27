import { beforeEach, describe, expect, it, vi } from "vitest";

const createCompletionMock = vi.fn();

vi.mock("@/env", () => ({
  env: {
    GROQ_MODEL: "test-model",
  },
}));

vi.mock("@/lib/logger", () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

vi.mock("@/server/ai/groq-client", () => ({
  groq: {
    chat: {
      completions: {
        create: createCompletionMock,
      },
    },
  },
  runGroqCall: async <T>(_context: unknown, run: () => Promise<T>) => run(),
  throwFriendlyGroqError: (error: unknown): never => {
    throw error;
  },
}));

describe("scoreComprehension", () => {
  beforeEach(() => {
    createCompletionMock.mockReset();
  });

  it("returns score 50 fallback when JSON parsing fails twice", async () => {
    createCompletionMock.mockResolvedValue({
      choices: [{ message: { content: "not-json" } }],
    });

    const { scoreComprehension } = await import("./analysis");
    const result = await scoreComprehension("photosynthesis", "I am not sure", "");

    expect(result.score).toBe(50);
    expect(result.misconceptionTag).toBeNull();
    expect(result.confidenceLevel).toBe("low");
    expect(createCompletionMock).toHaveBeenCalledTimes(2);
  });

  it("returns a valid model score inside 0-100 bounds", async () => {
    createCompletionMock.mockResolvedValue({
      choices: [
        {
          message: {
            content: JSON.stringify({
              score: 88,
              misconceptionTag: null,
              reasoning: "The response connects the concept to causal design.",
              confidenceLevel: "high",
            }),
          },
        },
      ],
    });

    const { scoreComprehension } = await import("./analysis");
    const result = await scoreComprehension(
      "correlation",
      "Correlation suggests a relationship but does not prove causation.",
      "",
    );

    expect(result.score).toBeGreaterThanOrEqual(0);
    expect(result.score).toBeLessThanOrEqual(100);
    expect(result.score).toBe(88);
  });

  it("falls back to an in-bounds score when the model returns an invalid score", async () => {
    createCompletionMock.mockResolvedValue({
      choices: [
        {
          message: {
            content: JSON.stringify({
              score: 140,
              misconceptionTag: null,
              reasoning: "The response was over-scored.",
              confidenceLevel: "medium",
            }),
          },
        },
      ],
    });

    const { scoreComprehension } = await import("./analysis");
    const result = await scoreComprehension("gravity", "Objects fall down.", "");

    expect(result.score).toBe(50);
    expect(result.score).toBeGreaterThanOrEqual(0);
    expect(result.score).toBeLessThanOrEqual(100);
  });
});
