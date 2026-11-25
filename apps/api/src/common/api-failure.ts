import { HttpException } from '@nestjs/common';
import { errorWords, type ErrorCode } from '@smartapp/core';

/**
 * Every expected failure goes through here, so the body is always the ApiError shape with our words
 * (rule 7: screens word errors from `code`). Throw it from services; the filter passes it on.
 */
export class ApiFailure extends HttpException {
  constructor(
    readonly code: ErrorCode,
    status: number,
    fieldErrors?: Record<string, string[]>,
  ) {
    super(
      { status, code, message: errorWords(code), ...(fieldErrors ? { fieldErrors } : {}) },
      status,
    );
  }
}

/** Rule 12: another shop's things, and anything the caller may not see, are simply not there. */
export function notFound(): ApiFailure {
  return new ApiFailure('not_found', 404);
}

export function notSignedIn(): ApiFailure {
  return new ApiFailure('not_signed_in', 401);
}
