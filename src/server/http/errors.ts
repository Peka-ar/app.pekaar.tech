export const ERROR_CODES = [
  "VALIDATION",
  "UNAUTHENTICATED",
  "FORBIDDEN",
  "NOT_FOUND",
  "STATE_CONFLICT",
  "QUOTA_EXCEEDED",
  "RATE_LIMITED",
  "INTERNAL",
] as const;

export type ErrorCode = (typeof ERROR_CODES)[number];

const HTTP_BY_CODE: Record<ErrorCode, number> = {
  VALIDATION: 400,
  UNAUTHENTICATED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  STATE_CONFLICT: 409,
  QUOTA_EXCEEDED: 402,
  RATE_LIMITED: 429,
  INTERNAL: 500,
};

export interface AppErrorOptions {
  httpStatus?: number;
  /** Message safe to show to end users. Defaults to `message`. */
  userMessage?: string;
  cause?: unknown;
}

export class AppError extends Error {
  readonly code: ErrorCode;
  readonly httpStatus: number;
  readonly userMessage: string;

  constructor(code: ErrorCode, message: string, options: AppErrorOptions = {}) {
    super(message, options.cause !== undefined ? { cause: options.cause } : undefined);
    this.name = "AppError";
    this.code = code;
    this.httpStatus = options.httpStatus ?? HTTP_BY_CODE[code];
    this.userMessage = options.userMessage ?? message;
  }
}

export class ValidationError extends AppError {
  constructor(message: string, options: AppErrorOptions = {}) {
    super("VALIDATION", message, options);
    this.name = "ValidationError";
  }
}

export class UnauthenticatedError extends AppError {
  constructor(message = "Unauthorized", options: AppErrorOptions = {}) {
    super("UNAUTHENTICATED", message, options);
    this.name = "UnauthenticatedError";
  }
}

/** Session exists but no matching `users` row (e.g. DB wiped or user deleted). */
export class StaleSessionError extends UnauthenticatedError {
  constructor(message = "Your session is no longer valid. Please sign in again.", options: AppErrorOptions = {}) {
    super(message, options);
    this.name = "StaleSessionError";
  }
}

export class ForbiddenError extends AppError {
  constructor(message = "Forbidden", options: AppErrorOptions = {}) {
    super("FORBIDDEN", message, options);
    this.name = "ForbiddenError";
  }
}

export class NotFoundError extends AppError {
  constructor(message = "Not found", options: AppErrorOptions = {}) {
    super("NOT_FOUND", message, options);
    this.name = "NotFoundError";
  }
}

export class ConflictError extends AppError {
  constructor(message: string, options: AppErrorOptions = {}) {
    super("STATE_CONFLICT", message, options);
    this.name = "ConflictError";
  }
}

export class QuotaExceededError extends AppError {
  constructor(message: string, options: AppErrorOptions = {}) {
    super("QUOTA_EXCEEDED", message, options);
    this.name = "QuotaExceededError";
  }
}

export class RateLimitError extends AppError {
  constructor(message = "Too many requests. Please try again later.", options: AppErrorOptions = {}) {
    super("RATE_LIMITED", message, options);
    this.name = "RateLimitError";
  }
}

export class InternalError extends AppError {
  constructor(message = "Internal server error", options: AppErrorOptions = {}) {
    super("INTERNAL", message, options);
    this.name = "InternalError";
  }
}

/** Discriminated-result error used by the server-action contract. */
export interface ActionResultError {
  code: ErrorCode;
  message: string;
}

export function isAppError(err: unknown): err is AppError {
  return err instanceof AppError;
}

export function toActionResultError(err: unknown): ActionResultError {
  if (err instanceof AppError) {
    return { code: err.code, message: err.userMessage };
  }
  if (err instanceof Error) {
    return { code: "INTERNAL", message: "Something went wrong. Please try again." };
  }
  return { code: "INTERNAL", message: "Something went wrong. Please try again." };
}
