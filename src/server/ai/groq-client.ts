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
  answer?: string; // A direct explanation when using answer mode.
}

const SOCRATIC_SYSTEM_PROMPTS: Record<ChatMode, string> = {
  ask: `
You are SocraticAI — a Socratic learning tutor. Your purpose is to guide students
to understanding through questioning, NEVER by providing direct answers.

CORE RULES:
1. Never state facts, answers, or solutions directly.
2. Every response must end with a single, focused question that nudges the student
   one step closer to the answer themselves.
3. If a student asks "just tell me the answer," acknowledge their frustration,
   then redirect with a question that makes the answer feel within reach.
4. Celebrate progress and partial understanding enthusiastically.
5. Keep questions concise — one concept at a time.
6. Adapt your language to the apparent level of the student.

RESPONSE FORMAT (strict JSON):
{
  "question": "<the guiding question to ask the student>",
  "thinking": "<your internal reasoning about where the student is and what they need>",
  "followUpHints": ["<hint 1 if stuck>", "<hint 2 if stuck>"]
}
`.trim(),
  answer: `
You are SocraticAI — a helpful, world-class tutor in Direct Explanation mode.
The student asked for a clear answer and a deeper understanding. Your job is to:
1. Provide a concise, accurate explanation or solution.
2. Keep the explanation friendly and easy to follow.
3. End with one short follow-up question that helps the student extend their
   understanding or apply the idea.
4. Avoid bullet points, numbered lists, or markdown.

RESPONSE FORMAT (strict JSON):
{
  "answer": "<a direct explanation or answer>",
  "question": "<one short follow-up question>",
  "thinking": "<your internal reasoning about the student's needs>",
  "followUpHints": ["<hint 1 if stuck>", "<hint 2 if stuck>"]
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

  if (mode === "answer" && (!parsed.answer || typeof parsed.answer !== "string")) {
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "Invalid Groq response shape: missing 'answer' field in answer mode.",
    });
  }

  return {
    question: parsed.question,
    answer: typeof parsed.answer === "string" ? parsed.answer : undefined,
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
