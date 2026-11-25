import { ApiErrorSchema, errorWords, type ApiError, type ErrorCode } from '@smartapp/core';
import type { z } from 'zod';

export class ApiRequestError extends Error {
  readonly apiError: ApiError;

  constructor(apiError: ApiError) {
    super(apiError.message);
    this.name = 'ApiRequestError';
    this.apiError = apiError;
  }
}

/** The error code of a failed request ('unknown' for anything else), so screens word errors from it. */
export function errorCodeOf(error: unknown): ErrorCode {
  return error instanceof ApiRequestError ? error.apiError.code : 'unknown';
}

export async function fetchApi<T>(
  url: string,
  schema: z.ZodType<T>,
  options?: RequestInit,
): Promise<T> {
  let res: Response;
  // The owner's session rides in httpOnly cookies set by the API (T116), so every call sends them; our own
  // header marks the call as ours (the API refuses writes without it: a CSRF guard).
  const headers = new Headers(options?.headers);
  headers.set('x-smartapp', '1');
  try {
    res = await fetch(url, { ...options, headers, credentials: options?.credentials ?? 'include' });
  } catch {
    // The request never left the phone or got no answer: word it as offline, not a server error.
    throw new ApiRequestError({ status: 0, code: 'offline', message: errorWords('offline') });
  }
  if (!res.ok) {
    let errorJson: unknown = null;
    try {
      errorJson = await res.json();
    } catch {
      // Non-JSON response
    }
    const parsed = ApiErrorSchema.safeParse(errorJson);
    if (parsed.success) {
      throw new ApiRequestError(parsed.data);
    }
    throw new ApiRequestError({
      status: res.status,
      code: 'unknown',
      message: errorWords('unknown'),
    });
  }
  const json: unknown = await res.json();
  return schema.parse(json);
}
