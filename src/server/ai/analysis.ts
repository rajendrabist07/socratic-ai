import type { Message, Session } from "@prisma/client";
import { env } from "@/env";
import { groq } from "@/server/ai/groq-client";

const ANALYSIS_TIMEOUT_MS = 10_000;
const SDK_TIMEOUT_BUFFER_MS = 1_000;

export type { Message, Session } from "@prisma/client";

export interface ComprehensionScore {
  score: number;
  misconceptionTag: string | null;
}

export interface ThinkingMapData {
  breakthroughMessageId: string;
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
 * @returns A 0-100 score and an optional misconception tag.
 */
export async function scoreComprehension(
  topic: string,
  userMessage: string,
  conversationHistory: string,
): Promise<ComprehensionScore> {
  const fallback = buildFallbackComprehensionScore(userMessage);

  const completion = await withAnalysisTimeout(
    "Comprehension scoring",
    (signal) =>
      groq.chat.completions.create(
        {
          model: env.GROQ_MODEL,
          messages: [
            {
              role: "system",
              content: `
You score student comprehension for SocraticAI.
Return only valid JSON with this shape:
{
  "score": 0,
  "misconceptionTag": null
}

Scoring rules:
- 0-20: no relevant understanding, refusal, or empty/vague response.
- 21-49: vague, memorized, or confused response with weak reasoning.
- 50-74: partial understanding with gaps or unsupported assumptions.
- 75-89: solid understanding with minor gaps.
- 90-100: precise, transferable conceptual understanding.

misconceptionTag must be a short phrase such as "confuses correlation with causation", or null when no clear misconception is detected.
Do not include explanation, markdown, or extra keys.
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
          ],
          temperature: 0,
          max_tokens: 120,
          response_format: { type: "json_object" },
        },
        {
          timeout: ANALYSIS_TIMEOUT_MS + SDK_TIMEOUT_BUFFER_MS,
          maxRetries: 0,
          signal,
        },
      ),
  );

  const raw = completion.choices[0]?.message?.content;
  const parsed = parseJsonObject(raw);

  if (!parsed) {
    return fallback;
  }

  return normalizeComprehensionScore(parsed, fallback);
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

  const completion = await withAnalysisTimeout("Thinking Map generation", (signal) =>
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
  "breakthroughMessageId": "message-id",
  "misconceptions": ["short misconception phrase"],
  "scoreTimeline": [0, 25, 50],
  "summary": "one concise paragraph",
  "keyInsight": "one concise sentence"
}

Rules:
- breakthroughMessageId must be one of the provided message ids.
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
  );

  const raw = completion.choices[0]?.message?.content;
  const parsed = parseJsonObject(raw);

  if (!parsed) {
    return fallback;
  }

  return normalizeThinkingMapData(parsed, fallback, orderedMessages);
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
  fallback: ComprehensionScore,
): ComprehensionScore {
  return {
    score:
      typeof parsed.score === "number" && Number.isFinite(parsed.score)
        ? clampScore(parsed.score)
        : fallback.score,
    misconceptionTag:
      typeof parsed.misconceptionTag === "string" &&
      parsed.misconceptionTag.trim().length > 0
        ? parsed.misconceptionTag.trim().slice(0, 80)
        : null,
  };
}

function normalizeThinkingMapData(
  parsed: Record<string, unknown>,
  fallback: ThinkingMapData,
  messages: Message[],
): ThinkingMapData {
  const validMessageIds = new Set(messages.map((message) => message.id));
  const breakthroughMessageId =
    typeof parsed.breakthroughMessageId === "string" &&
    validMessageIds.has(parsed.breakthroughMessageId)
      ? parsed.breakthroughMessageId
      : fallback.breakthroughMessageId;

  return {
    breakthroughMessageId,
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

function buildFallbackComprehensionScore(userMessage: string): ComprehensionScore {
  const normalized = userMessage.trim().toLowerCase();
  const vagueResponses = new Set([
    "",
    "idk",
    "i don't know",
    "i dont know",
    "not sure",
    "maybe",
    "no idea",
    "i guess",
  ]);

  if (
    vagueResponses.has(normalized) ||
    normalized.split(/\s+/).filter(Boolean).length < 4
  ) {
    return { score: 25, misconceptionTag: "vague or unsupported response" };
  }

  return { score: 50, misconceptionTag: null };
}

function buildFallbackThinkingMap(
  session: Session,
  messages: Message[],
): ThinkingMapData {
  const userMessages = messages.filter((message) => message.role === "USER");
  const scoredMessages = userMessages.filter(
    (message) => typeof message.comprehensionScore === "number",
  );
  const breakthrough =
    scoredMessages.reduce<Message | null>((best, message) => {
      if (!best) {
        return message;
      }

      return (message.comprehensionScore ?? 0) > (best.comprehensionScore ?? 0)
        ? message
        : best;
    }, null) ??
    userMessages[userMessages.length - 1] ??
    messages[messages.length - 1];

  return {
    breakthroughMessageId: breakthrough?.id ?? session.id,
    misconceptions: [],
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
