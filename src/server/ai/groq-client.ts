import Groq from "groq-sdk";
import { TRPCError } from "@trpc/server";
import { env } from "@/env";

// ─── Singleton client ────────────────────────────────────────────────────────

export const groq = new Groq({
  apiKey: env.GROQ_API_KEY,
});

// ─── Types ───────────────────────────────────────────────────────────────────

export type ChatMode = "ask" | "answer";

export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface SocraticResponse {
  question: string; // The guiding question or follow-up question for the student.
  thinking: string; // Internal chain-of-thought (not shown to student)
  followUpHints: string[]; // Optional nudges if the student is stuck.
}

const SOCRATIC_SYSTEM_PROMPTS: Record<ChatMode, string> = {
  ask: `
You are SocraticAI, a strict Socratic tutor.

Non-negotiable rules:
- NEVER give direct answers, explanations, definitions, examples-as-answers, or solutions.
- ALWAYS respond with exactly one guiding question.
- Detect the user's likely misconception and target that misconception with the question.
- Keep the question under 80 words.
- Never start with "Great question!" or any praise.
- Do not acknowledge frustration, validate, summarize, use markdown, or add a preamble.
- The visible response must be only the question and must end with a question mark.

RESPONSE FORMAT (strict JSON):
{
  "question": "<the guiding question to ask the student>",
  "thinking": "<brief private note naming the likely misconception>",
  "followUpHints": []
}
`.trim(),
  answer: `
You are SocraticAI, a strict Socratic tutor. Even if a direct-answer mode is requested,
you must not answer directly.

Non-negotiable rules:
- NEVER give direct answers, explanations, definitions, examples-as-answers, or solutions.
- ALWAYS respond with exactly one guiding question.
- Detect the user's likely misconception and target that misconception with the question.
- Keep the question under 80 words.
- Never start with "Great question!" or any praise.
- Do not acknowledge frustration, validate, summarize, use markdown, or add a preamble.
- The visible response must be only the question and must end with a question mark.

RESPONSE FORMAT (strict JSON):
{
  "question": "<the guiding question to ask the student>",
  "thinking": "<brief private note naming the likely misconception>",
  "followUpHints": []
}
`.trim(),
};

export async function askSocratic(
  history: ChatMessage[],
  userMessage: string,
  mode: ChatMode = "ask",
): Promise<SocraticResponse> {
  const messages: ChatMessage[] = [
    { role: "system", content: SOCRATIC_SYSTEM_PROMPTS[mode] },
    ...history,
    { role: "user", content: userMessage },
  ];

  let completion;

  try {
    completion = await groq.chat.completions.create({
      model: env.GROQ_MODEL,
      messages,
      temperature: 0.7,
      max_tokens: 1024,
      response_format: { type: "json_object" },
    });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Groq request failed with an unknown error.";

    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: `Groq request failed: ${message}. Please verify your GROQ_API_KEY and model configuration.`,
    });
  }

  const raw = completion.choices[0]?.message?.content;

  if (!raw) {
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "Groq returned an empty response. Please try again or check your model prompt.",
    });
  }

  let parsed: Partial<SocraticResponse>;

  try {
    parsed = JSON.parse(raw) as Partial<SocraticResponse>;
  } catch (error) {
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "Failed to parse Groq response. The AI response is not valid JSON.",
    });
  }

  if (!parsed.question || typeof parsed.question !== "string") {
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "Invalid Groq response shape: missing 'question' field.",
    });
  }

  return {
    question: enforceSingleQuestion(parsed.question),
    thinking: parsed.thinking ?? "",
    followUpHints: Array.isArray(parsed.followUpHints) ? parsed.followUpHints : [],
  };
}

export function trimHistory(
  history: ChatMessage[],
  maxTurns = 20,
): ChatMessage[] {
  const userAndAssistant = history.filter((m) => m.role !== "system");
  return userAndAssistant.slice(-maxTurns * 2);
}

function enforceSingleQuestion(value: string): string {
  const cleaned = value.replace(/\s+/g, " ").trim();
  const firstQuestion = cleaned.match(/[^?]*\?/u)?.[0]?.trim();
  const question = firstQuestion && firstQuestion.length > 0 ? firstQuestion : cleaned;
  const words = question.split(/\s+/).filter(Boolean);
  const capped = words.length > 80 ? `${words.slice(0, 80).join(" ")}?` : question;

  return capped.endsWith("?") ? capped : `${capped}?`;
}
