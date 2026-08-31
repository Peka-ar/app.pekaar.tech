import { NextResponse } from "next/server";
import { AppwriteException } from "node-appwrite";
import { logger } from "@/server/logging";
import { AppError, InternalError, NotFoundError, RateLimitError, UnauthenticatedError, ValidationError, ForbiddenError } from "@/server/http/errors";

export interface ApiErrorBody {
  error: { code: string; message: string };
}

function appwriteExceptionToAppError(err: AppwriteException): AppError | null {
  const status = typeof err.code === "number" ? err.code : Number(err.code);
  if (Number.isFinite(status)) {
    if (status === 404) return new NotFoundError("Not found", { cause: err });
    if (status === 429) return new RateLimitError(undefined, { cause: err });
    if (status === 401) return new UnauthenticatedError(undefined, { cause: err });
    if (status === 403) return new ForbiddenError(undefined, { cause: err });
    if (status === 400) return new ValidationError("Invalid request", { cause: err });
  }
  return null;
}

/** Maps any thrown value to a JSON error response, logging unhandled failures. */
export function handleApiError(err: unknown, meta?: Record<string, unknown>): NextResponse<ApiErrorBody> {
  if (err instanceof AppError) {
    return NextResponse.json(
      { error: { code: err.code, message: err.userMessage } },
      { status: err.httpStatus },
    );
  }
  if (err instanceof AppwriteException) {
    const mapped = appwriteExceptionToAppError(err);
    if (mapped) {
      return NextResponse.json(
        { error: { code: mapped.code, message: mapped.userMessage } },
        { status: mapped.httpStatus },
      );
    }
  }
  logger.error("unhandled api route error", {
    ...meta,
    err: err instanceof Error ? { name: err.name, message: err.message, stack: err.stack } : err,
  });
  const internal = new InternalError();
  return NextResponse.json(
    { error: { code: internal.code, message: internal.userMessage } },
    { status: internal.httpStatus },
  );
}

type RouteHandler<C> = (request: Request, ctx: C) => Promise<NextResponse>;

/** Wraps a route handler: converts thrown AppError/AppwriteException into JSON responses. */
export function withApi<C = { params: Promise<Record<string, string>> }>(
  handler: RouteHandler<C>,
  meta?: Record<string, unknown>,
): RouteHandler<C> {
  return async (request, ctx) => {
    try {
      return await handler(request, ctx);
    } catch (err) {
      return handleApiError(err, { route: meta?.route });
    }
  };
}
