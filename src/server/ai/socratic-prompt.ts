/**
 * A conversational message that can be included as context for the Socratic
 * system prompt.
 */
export interface Message {
  role: "user" | "assistant";
  content: string;
}

/**
 * Builds a complete Socratic system prompt for the AI tutor.
 *
 * The returned string is designed to be passed directly as the `system` message
 * to the Groq chat completions API. It is pure: it only derives prompt text from
 * the provided arguments and performs no side effects, I/O, or API calls.
 *
 * The prompt enforces SocraticAI's core product rule: the assistant must never
 * answer directly, define concepts, explain concepts, summarize the student's
 * words, or add preamble. It must produce exactly one guiding question under
 * 80 words that probes the student's existing understanding.
 *
 * @param topic - The topic or concept the student is currently studying.
 * @param messages - Prior user and assistant messages used only as conversation context.
 * @param avgScore - The student's average score from 0 to 100, used to select the tutoring approach.
 * @returns A complete system prompt string ready to pass as a Groq `system` message.
 *
 * @example
 * const prompt = buildSocraticPrompt("linear equations", [], 20);
 *
 * @example
 * const advancedPrompt = buildSocraticPrompt(
 *   "linear equations",
 *   [{ role: "user", content: "I think both sides must stay equal." }],
 *   80,
 * );
 */
export function buildSocraticPrompt(
  topic: string,
  messages: Message[],
  avgScore: number,
): string {
  const normalizedTopic = topic.trim() || "the current topic";
  const levelGuidance = getLevelGuidance(avgScore);
  const recentContext = buildRecentContext(messages);

  return `
You are SocraticAI, a strict Socratic tutor for the topic: "${normalizedTopic}".

Your only job is to guide the student toward understanding by asking one carefully chosen question.

Core behavior:
- NEVER directly answer the student's question.
- NEVER explain concepts.
- NEVER define terms.
- NEVER solve the problem.
- ALWAYS respond with exactly one guiding question.
- Detect the student's likely misconception and target that misconception directly with the question.
- The question must probe what the student already understands, assumes, or can infer.
- Keep the response under 80 words.
- Use one question only, with no preamble and no follow-up sentence.
- End with a question mark.

NEVER-DO list:
- Never say "Great question!".
- Never use praise, validation, or encouragement before the question.
- Never give definitions.
- Never summarize what the student said.
- Never restate the student's message.
- Never say whether the student is right or wrong.
- Never provide examples as answers.
- Never use bullet points, numbered lists, JSON, markdown, or multiple sentences.

Adaptive approach:
${levelGuidance}

Conversation context:
${recentContext}

Before responding, silently check:
- Is the response exactly one question?
- Is it under 80 words?
- Does it avoid direct answers, explanations, definitions, and summaries?
- Does it target the student's likely misconception instead of asking a generic next question?
- Does it match the adaptive approach for avgScore ${avgScore}?

Return only the single guiding question.
`.trim();
}

/**
 * Selects score-specific Socratic guidance.
 *
 * @param avgScore - The student's average score from 0 to 100.
 * @returns Prompt instructions that adapt the question style to the score band.
 */
function getLevelGuidance(avgScore: number): string {
  if (avgScore < 40) {
    return [
      "- Student level: foundational.",
      "- Use simple everyday analogies inside the question when useful.",
      "- Check basic assumptions before probing details.",
      "- Ask about concrete intuition, prior knowledge, or the first small step.",
      "- Avoid abstract edge cases or advanced vocabulary.",
    ].join("\n");
  }

  if (avgScore <= 75) {
    return [
      "- Student level: developing.",
      "- Probe deeper reasoning rather than surface recall.",
      "- Introduce one edge case or changed condition when useful.",
      "- Ask the student to test whether their reasoning still holds.",
      "- Focus on connections, assumptions, and cause-effect reasoning.",
    ].join("\n");
  }

  return [
    "- Student level: advanced.",
    "- Challenge the student with a contradiction, limitation, or advanced application.",
    "- Ask them to inspect hidden assumptions in their reasoning.",
    "- Push for transfer to unfamiliar cases or stricter constraints.",
    "- Prefer questions that require justification, defense, or synthesis.",
  ].join("\n");
}

/**
 * Formats the most recent conversation messages as compact context for the
 * system prompt while avoiding unbounded prompt growth.
 *
 * @param messages - Prior user and assistant messages.
 * @returns A short context block, or a placeholder when no messages exist.
 */
function buildRecentContext(messages: Message[]): string {
  const recentMessages = messages.slice(-6);

  if (recentMessages.length === 0) {
    return "No prior messages. Start by probing the student's current understanding of the topic.";
  }

  return recentMessages
    .map((message) => {
      const role = message.role === "user" ? "Student" : "Assistant";
      return `${role}: ${truncateForPrompt(message.content, 240)}`;
    })
    .join("\n");
}

/**
 * Truncates a string to a maximum length for prompt context.
 *
 * @param value - The string to truncate.
 * @param maxLength - The maximum number of characters to keep.
 * @returns The original string when short enough, otherwise a trimmed excerpt.
 */
function truncateForPrompt(value: string, maxLength: number): string {
  const normalized = value.replace(/\s+/g, " ").trim();

  if (normalized.length <= maxLength) {
    return normalized;
  }

  return `${normalized.slice(0, maxLength - 3).trim()}...`;
}
