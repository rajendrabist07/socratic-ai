const FRIENDLY_ERROR_MESSAGES = [
  "AI service configuration error. Please contact support.",
  "Too many requests. Please wait a few seconds and try again.",
  "You're sending messages too fast. Please wait a moment.",
  "You're creating sessions too fast. Please wait a moment.",
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
  const code = getTRPCErrorCode(error);

  if (code === "TOO_MANY_REQUESTS") {
    if (message.includes("creating sessions")) {
      return "You have reached the session limit. Please try again in about an hour.";
    }

    return "You have reached the message limit. Please wait about a minute before trying again.";
  }

  const knownMessage = FRIENDLY_ERROR_MESSAGES.find((friendlyMessage) =>
    message.includes(friendlyMessage),
  );

  const friendly = knownMessage ?? fallback;
  
  if (process.env.NODE_ENV === "development" && message) {
    return `${friendly} [Detail: ${message}]`;
  }

  return friendly;


}

function getTRPCErrorCode(error: unknown): string | null {
  if (!error || typeof error !== "object" || !("data" in error)) {
    return null;
  }

  const data = (error as { data: unknown }).data;

  if (!data || typeof data !== "object" || !("code" in data)) {
    return null;
  }

  const code = (data as { code: unknown }).code;

  return typeof code === "string" ? code : null;
}
