import Groq from "groq-sdk";
import { env } from "@/env";

// ─── Singleton client ────────────────────────────────────────────────────────

export const groq = new Groq({
  apiKey: env.GROQ_API_KEY,
});

// ─── Types ───────────────────────────────────────────────────────────────────

export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface SocraticResponse {
  question: string;       // The guiding question posed back to the student
  thinking: string;       // Internal chain-of-thought (not shown to student)
  followUpHints: string[]; // Optional nudges if the student is stuck
}

// ─── System prompt ───────────────────────────────────────────────────────────

export const SOCRATIC_SYSTEM_PROMPT = `
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
`.trim();

// ─── Core inference function ─────────────────────────────────────────────────

export async function askSocratic(
  history: ChatMessage[],
  userMessage: string,
): Promise<SocraticResponse> {
  const messages: ChatMessage[] = [
    { role: "system", content: SOCRATIC_SYSTEM_PROMPT },
    ...history,
    { role: "user", content: userMessage },
  ];

  const completion = await groq.chat.completions.create({
    model: env.GROQ_MODEL,
    messages,
    temperature: 0.7,
    max_tokens: 1024,
    response_format: { type: "json_object" },
  });

  const raw = completion.choices[0]?.message?.content;

  if (!raw) {
    throw new Error("Groq returned an empty response");
  }

  const parsed = JSON.parse(raw) as Partial<SocraticResponse>;

  if (!parsed.question || typeof parsed.question !== "string") {
    throw new Error("Invalid Groq response shape: missing 'question' field");
  }

  return {
    question: parsed.question,
    thinking: parsed.thinking ?? "",
    followUpHints: Array.isArray(parsed.followUpHints)
      ? parsed.followUpHints
      : [],
  };
}

// ─── Token-aware history trimmer ─────────────────────────────────────────────
// Groq context windows are large but finite — keep the last N turns.

export function trimHistory(
  history: ChatMessage[],
  maxTurns = 20,
): ChatMessage[] {
  // Always keep the system prompt out of this array; it's prepended in askSocratic.
  const userAndAssistant = history.filter((m) => m.role !== "system");
  return userAndAssistant.slice(-maxTurns * 2); // Each turn = user + assistant
}
