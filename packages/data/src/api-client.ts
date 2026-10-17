import { ApiErrorSchema, errorWords, type ApiError } from '@smartapp/core';
import type { z } from 'zod';

export class ApiRequestError extends Error {
  readonly apiError: ApiError;

  constructor(apiError: ApiError) {
    super(apiError.message);
    this.name = 'ApiRequestError';
    this.apiError = apiError;
  }
}

export async function fetchApi<T>(
  url: string,
  schema: z.ZodType<T>,
  options?: RequestInit,
): Promise<T> {
  const res = await fetch(url, options);
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
