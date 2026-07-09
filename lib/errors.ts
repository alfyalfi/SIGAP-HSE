const ERROR_PREFIX = "SIGAP";

export type NormalizedError = {
  errorId: string;
  message: string;
};

function randomSegment(length = 6) {
  return Math.random()
    .toString(36)
    .slice(2, 2 + length)
    .toUpperCase();
}

export function makeErrorId(scope = "GEN") {
  const safeScope = scope.replace(/[^A-Z0-9]/gi, "").slice(0, 8).toUpperCase() || "GEN";
  const time = Date.now().toString(36).toUpperCase();
  return `${ERROR_PREFIX}-${safeScope}-${time}-${randomSegment()}`;
}

export function normalizeError(error: unknown, fallbackMessage: string, scope = "GEN"): NormalizedError {
  if (error && typeof error === "object") {
    const typed = error as { message?: unknown; errorId?: unknown; digest?: unknown };
    const existingId =
      typeof typed.errorId === "string" && typed.errorId.trim()
        ? typed.errorId.trim()
        : typeof typed.digest === "string" && typed.digest.trim()
          ? `${ERROR_PREFIX}-${scope.replace(/[^A-Z0-9]/gi, "").slice(0, 8).toUpperCase() || "GEN"}-${typed.digest
              .trim()
              .slice(0, 8)
              .toUpperCase()}`
          : "";
    const message = typeof typed.message === "string" && typed.message.trim() ? typed.message.trim() : fallbackMessage;
    return {
      errorId: existingId || makeErrorId(scope),
      message,
    };
  }

  return {
    errorId: makeErrorId(scope),
    message: fallbackMessage,
  };
}

export function formatErrorMessage(
  error: unknown,
  fallbackMessage: string,
  scope = "GEN"
) {
  const normalized = normalizeError(error, fallbackMessage, scope);
  return `${normalized.message} [${normalized.errorId}]`;
}

export function displayErrorMessage(
  error: unknown,
  fallbackMessage: string,
  scope = "GEN"
) {
  if (error instanceof Error && /SIGAP-[A-Z0-9-]+/i.test(error.message)) {
    return error.message;
  }
  return formatErrorMessage(error, fallbackMessage, scope);
}

export function toErrorBody(
  error: unknown,
  fallbackMessage: string,
  scope = "GEN"
) {
  const normalized = normalizeError(error, fallbackMessage, scope);
  return {
    error: `${normalized.message} [${normalized.errorId}]`,
    errorId: normalized.errorId,
  };
}
