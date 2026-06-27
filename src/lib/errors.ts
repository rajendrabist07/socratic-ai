const FRIENDLY_ERROR_MESSAGES = [
  "AI service configuration error. Please contact support.",
  "Too many requests. Please wait a few seconds and try again.",
  "AI service temporarily unavailable. Please try again.",
  "Unable to load session. Please refresh.",
  "Unable to create session. Please try again.",
  "Unable to generate Thinking Map. Please try again.",
] as const;

export function toFriendlyErrorMessage(
  error: unknown,
  fallback = "Something went wrong. Please try again.",
): string {
  const message = error instanceof Error ? error.message : "";

  const knownMessage = FRIENDLY_ERROR_MESSAGES.find((friendlyMessage) =>
    message.includes(friendlyMessage),
  );

  return knownMessage ?? fallback;
}
