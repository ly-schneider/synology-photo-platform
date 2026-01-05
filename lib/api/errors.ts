import { NextResponse } from "next/server";

import { SynologyApiError } from "@/lib/synology/types";

type ErrorDetails = Record<string, unknown>;

type UpstreamDetails = {
  provider: "synology";
  synologyErrorCode: number | null;
};

export class ApiError extends Error {
  public readonly status: number;
  public readonly code: string;
  public readonly details?: ErrorDetails;

  constructor(status: number, code: string, message: string, details?: ErrorDetails) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

export function badRequest(message: string, details?: ErrorDetails): ApiError {
  return new ApiError(400, "BAD_REQUEST", message, details);
}

export function notFound(message: string): ApiError {
  return new ApiError(404, "NOT_FOUND", message);
}

export function unauthorized(message: string): ApiError {
  return new ApiError(401, "UNAUTHORIZED", message);
}

export function serviceUnavailable(message: string): ApiError {
  return new ApiError(503, "SERVICE_UNAVAILABLE", message);
}

export function rangeNotSatisfiable(message: string): ApiError {
  return new ApiError(416, "RANGE_NOT_SATISFIABLE", message);
}

function errorResponse(
  status: number,
  code: string,
  message: string,
  details?: ErrorDetails,
  upstream?: UpstreamDetails,
): NextResponse {
  const body: {
    error: {
      code: string;
      message: string;
      details?: ErrorDetails;
      upstream?: UpstreamDetails;
    };
    traceId: string;
  } = {
    error: { code, message },
    traceId: crypto.randomUUID(),
  };

  if (details) body.error.details = details;
  if (upstream) body.error.upstream = upstream;

  return NextResponse.json(body, { status });
}

export function handleApiError(err: unknown): NextResponse {
  if (err instanceof ApiError) {
    return errorResponse(err.status, err.code, err.message, err.details);
  }

  if (err instanceof SynologyApiError) {
    return errorResponse(502, "UPSTREAM_ERROR", err.message, undefined, {
      provider: "synology",
      synologyErrorCode: err.code ?? null,
    });
  }

  if (err instanceof Error && err.message.startsWith("Missing env")) {
    return errorResponse(503, "SERVICE_UNAVAILABLE", "Service unavailable");
  }

  return errorResponse(503, "SERVICE_UNAVAILABLE", "Service unavailable");
}
