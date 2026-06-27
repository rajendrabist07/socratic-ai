import type { Message, Session } from "@prisma/client";
import { env } from "@/env";
import {
  groq,
  runGroqCall,
  throwFriendlyGroqError,
  type ChatMessage,
} from "@/server/ai/groq-client";
import { logger } from "@/lib/logger";

const ANALYSIS_TIMEOUT_MS = 10_000;
const SDK_TIMEOUT_BUFFER_MS = 1_000;

export type { Message, Session } from "@prisma/client";

export interface ScoringResult {
  score: number;
  misconceptionTag: string | null;
  reasoning: string;
  confidenceLevel: "low" | "medium" | "high";
}

export interface ThinkingMapData {
  misconceptions: string[];
  scoreTimeline: number[];
  summary: string;
  keyInsight: string;
}

export class AnalysisTimeoutError extends Error {
  code = "ANALYSIS_TIMEOUT" as const;

  constructor(operation: string) {
    super(`${operation} exceeded ${ANALYSIS_TIMEOUT_MS / 1000} seconds`);
    this.name = "AnalysisTimeoutError";
  }
}

/**
 * Scores a student's latest message for conceptual comprehension.
 *
 * @param topic - The session topic being studied.
 * @param userMessage - The student's message to score.
 * @param conversationHistory - Plain-text conversation context.
 * @returns A calibrated 0-100 score, optional misconception tag, reasoning, and confidence.
 */
export async function scoreComprehension(
  topic: string,
  userMessage: string,
  conversationHistory: string,
): Promise<ScoringResult> {
  const fallback = buildFallbackComprehensionScore();
  const messages = buildComprehensionScoringMessages(
    topic,
    userMessage,
    conversationHistory,
  );

  for (let attempt = 1; attempt <= 2; attempt += 1) {
    let completion: Awaited<ReturnType<typeof groq.chat.completions.create>>;

    try {
      completion = await withAnalysisTimeout(
        "Comprehension scoring",
        (signal) =>
          runGroqCall(
            {
              operation: "scoreComprehension",
              model: env.GROQ_MODEL,
              topic,
            },
            () =>
              groq.chat.completions.create(
                {
                  model: env.GROQ_MODEL,
                  messages,
                  temperature: 0,
                  max_tokens: 180,
                  response_format: { type: "json_object" },
                },
                {
                  timeout: ANALYSIS_TIMEOUT_MS + SDK_TIMEOUT_BUFFER_MS,
                  maxRetries: 0,
                  signal,
                },
              ),
          ),
      );
    } catch (error) {
      throwFriendlyGroqError(error, { operation: "scoreComprehension" });
    }

    const raw = completion.choices[0]?.message?.content;
    const parsed = parseJsonObject(raw);
    const normalized = parsed ? normalizeComprehensionScore(parsed) : null;

    if (normalized) {
      return normalized;
    }

    logger.warn("Invalid comprehension scoring JSON", {
      operation: "scoreComprehension",
      attempt,
    });
  }

  logger.error("Comprehension scoring fell back after retry", {
    operation: "scoreComprehension",
    topic,
    fallbackScore: fallback.score,
  });

  return fallback;
}

/**
 * Generates a Thinking Map summary from the completed session conversation.
 *
 * @param session - The learning session being analyzed.
 * @param messages - All messages for the session, usually ordered by creation time.
 * @returns Structured Thinking Map data for visualization.
 */
export async function generateThinkingMap(
  session: Session,
  messages: Message[],
): Promise<ThinkingMapData> {
  const orderedMessages = [...messages].sort(
    (a, b) => a.createdAt.getTime() - b.createdAt.getTime(),
  );
  const fallback = buildFallbackThinkingMap(session, orderedMessages);

  let completion: Awaited<ReturnType<typeof groq.chat.completions.create>>;

  try {
    completion = await withAnalysisTimeout("Thinking Map generation", (signal) =>
      runGroqCall(
        {
          operation: "generateThinkingMap",
          model: env.GROQ_MODEL,
          topic: session.topic,
          sessionId: session.id,
        },
        () =>
          groq.chat.completions.create(
            {
              model: env.GROQ_MODEL,
              messages: [
                {
                  role: "system",
                  content: `
You generate SocraticAI Thinking Map data from a tutoring session.
Return only valid JSON with exactly this shape:
{
  "summary": "one concise paragraph",
  "keyInsight": "one concise sentence",
  "misconceptions": ["short misconception phrase"],
  "scoreTimeline": [0, 25, 50]
}

Rules:
- misconceptions must contain short phrases only; use [] if none are clear.
- scoreTimeline must be numeric scores from student messages in chronological order.
- summary must describe the student's reasoning path, not praise them.
- keyInsight must identify the main conceptual shift.
- Do not include markdown, explanations, or extra keys.
`.trim(),
                },
                {
                  role: "user",
                  content: buildThinkingMapContext(session, orderedMessages),
                },
              ],
              temperature: 0.2,
              max_tokens: 600,
              response_format: { type: "json_object" },
            },
            {
              timeout: ANALYSIS_TIMEOUT_MS + SDK_TIMEOUT_BUFFER_MS,
              maxRetries: 0,
              signal,
            },
          ),
      ),
    );
  } catch (error) {
    throwFriendlyGroqError(error, {
      operation: "generateThinkingMap",
      sessionId: session.id,
    });
  }

  const raw = completion.choices[0]?.message?.content;
  const parsed = parseJsonObject(raw);

  if (!parsed) {
    return fallback;
  }

  return normalizeThinkingMapData(parsed, fallback);
}

async function withAnalysisTimeout<T>(
  operation: string,
  run: (signal: AbortSignal) => Promise<T>,
): Promise<T> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), ANALYSIS_TIMEOUT_MS);

  try {
    return await run(controller.signal);
  } catch (error) {
    if (controller.signal.aborted) {
      throw new AnalysisTimeoutError(operation);
    }

    throw error;
  } finally {
    clearTimeout(timeout);
  }
}

function parseJsonObject(value: string | null | undefined): Record<string, unknown> | null {
  if (!value) {
    return null;
  }

  try {
    const parsed = JSON.parse(value) as unknown;

    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      return parsed as Record<string, unknown>;
    }

    return null;
  } catch {
    return null;
  }
}

function normalizeComprehensionScore(
  parsed: Record<string, unknown>,
): ScoringResult | null {
  if (
    typeof parsed.score !== "number" ||
    !Number.isFinite(parsed.score) ||
    parsed.score < 0 ||
    parsed.score > 100
  ) {
    return null;
  }

  if (typeof parsed.reasoning !== "string" || parsed.reasoning.trim().length === 0) {
    return null;
  }

  if (!isConfidenceLevel(parsed.confidenceLevel)) {
    return null;
  }

  return {
    score: Math.round(parsed.score),
    misconceptionTag:
      typeof parsed.misconceptionTag === "string" &&
      parsed.misconceptionTag.trim().length > 0
        ? parsed.misconceptionTag.trim().slice(0, 80)
        : null,
    reasoning: parsed.reasoning.trim().slice(0, 220),
    confidenceLevel: parsed.confidenceLevel,
  };
}

function normalizeThinkingMapData(
  parsed: Record<string, unknown>,
  fallback: ThinkingMapData,
): ThinkingMapData {
  return {
    misconceptions: normalizeStringArray(parsed.misconceptions, 8),
    scoreTimeline: normalizeScoreTimeline(parsed.scoreTimeline, fallback.scoreTimeline),
    summary:
      typeof parsed.summary === "string" && parsed.summary.trim().length > 0
        ? parsed.summary.trim()
        : fallback.summary,
    keyInsight:
      typeof parsed.keyInsight === "string" && parsed.keyInsight.trim().length > 0
        ? parsed.keyInsight.trim()
        : fallback.keyInsight,
  };
}

function buildFallbackComprehensionScore(): ScoringResult {
  return {
    score: 50,
    misconceptionTag: null,
    reasoning: "The scoring model could not return a valid calibrated result.",
    confidenceLevel: "low",
  };
}

function buildComprehensionScoringMessages(
  topic: string,
  userMessage: string,
  conversationHistory: string,
): ChatMessage[] {
  return [
    {
      role: "system",
      content: `
You score student comprehension for SocraticAI using a stable rubric.
Return only valid JSON with this exact shape:
{
  "score": 0,
  "misconceptionTag": null,
  "reasoning": "one sentence explaining why this score was given",
  "confidenceLevel": "low"
}

SCORING RUBRIC:
- 0-20: No engagement, off-topic, or "I don't know"
- 21-40: Surface-level engagement, restates the question, no reasoning
- 41-60: Partial understanding, some correct reasoning but with gaps or a clear misconception
- 61-80: Solid understanding, correct reasoning with minor imprecision
- 81-100: Deep understanding, makes connections beyond the immediate question, anticipates edge cases

Few-shot calibration examples:
Example 1:
Topic: Photosynthesis
User response: I don't know, plants just eat sunlight.
Expected JSON: {"score":18,"misconceptionTag":"plants eat sunlight","reasoning":"The response is mostly disengaged and shows a core misconception about energy conversion.","confidenceLevel":"high"}

Example 2:
Topic: Newton's third law
User response: Forces come in pairs, but the bigger object probably pushes harder so it wins.
Expected JSON: {"score":52,"misconceptionTag":"bigger object exerts larger paired force","reasoning":"The response identifies force pairs but keeps a clear misconception about equal and opposite interaction forces.","confidenceLevel":"high"}

Example 3:
Topic: Correlation and causation
User response: A correlation can suggest a possible relationship, but it cannot prove one thing caused the other unless we control for other variables or have a causal design.
Expected JSON: {"score":88,"misconceptionTag":null,"reasoning":"The response explains the key distinction and connects it to controls and causal study design.","confidenceLevel":"high"}

Rules:
- Use the full rubric range, but stay consistent with the examples.
- misconceptionTag must be a short phrase or null.
- reasoning must be exactly one sentence.
- confidenceLevel must be "low", "medium", or "high".
- Do not include markdown or extra keys.
`.trim(),
    },
    {
      role: "user",
      content: `
Topic: ${topic}

Conversation history:
${conversationHistory || "No prior conversation."}

Student message to score:
${userMessage}
`.trim(),
    },
  ];
}

function isConfidenceLevel(value: unknown): value is ScoringResult["confidenceLevel"] {
  return value === "low" || value === "medium" || value === "high";
}

function buildFallbackThinkingMap(
  session: Session,
  messages: Message[],
): ThinkingMapData {
  const userMessages = messages.filter((message) => message.role === "USER");
  const misconceptionTags = userMessages
    .map((message) => message.misconceptionTag)
    .filter((tag): tag is string => typeof tag === "string" && tag.length > 0);

  return {
    misconceptions: Array.from(new Set(misconceptionTags)).slice(0, 8),
    scoreTimeline: userMessages
      .map((message) => message.comprehensionScore)
      .filter((score): score is number => typeof score === "number")
      .map(clampScore),
    summary: `The session focused on ${session.topic}.`,
    keyInsight: "The main conceptual shift was not clearly identifiable from the available messages.",
  };
}

function buildThinkingMapContext(session: Session, messages: Message[]): string {
  const messageLines = messages
    .map((message) => {
      const score =
        typeof message.comprehensionScore === "number"
          ? ` score=${clampScore(message.comprehensionScore)}`
          : "";

      return [
        `id=${message.id}`,
        `role=${message.role}`,
        `createdAt=${message.createdAt.toISOString()}`,
        score.trim(),
        `content=${message.content}`,
      ]
        .filter(Boolean)
        .join(" | ");
    })
    .join("\n");

  return `
Session:
id=${session.id}
title=${session.title}
topic=${session.topic}
status=${session.status}
createdAt=${session.createdAt.toISOString()}

Messages:
${messageLines || "No messages."}
`.trim();
}

function normalizeStringArray(value: unknown, maxItems: number): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .filter((item): item is string => typeof item === "string")
    .map((item) => item.trim())
    .filter(Boolean)
    .slice(0, maxItems);
}

function normalizeScoreTimeline(
  value: unknown,
  fallback: number[],
): number[] {
  if (!Array.isArray(value)) {
    return fallback;
  }

  const scores = value
    .filter((item): item is number => typeof item === "number" && Number.isFinite(item))
    .map(clampScore);

  return scores.length > 0 ? scores : fallback;
}

function clampScore(score: number): number {
  return Math.min(100, Math.max(0, Math.round(score)));
}
