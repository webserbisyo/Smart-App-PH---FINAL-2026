import {
  Catch,
  HttpException,
  HttpStatus,
  Logger,
  type ArgumentsHost,
  type ExceptionFilter,
} from '@nestjs/common';
import { errorWords, ErrorCodeEnum, type ApiError, type ErrorCode } from '@smartapp/core';
import { mapDbError, pgErrorOf } from '../../db/pg-errors.js';

function isRecord(val: unknown): val is Record<string, unknown> {
  return typeof val === 'object' && val !== null;
}

function isFieldErrors(val: unknown): val is Record<string, string[]> {
  if (!isRecord(val)) return false;
  return Object.values(val).every(
    (arr) => Array.isArray(arr) && arr.every((item) => typeof item === 'string'),
  );
}

function isErrorCode(value: string): value is ErrorCode {
  return ErrorCodeEnum.safeParse(value).success;
}

interface HttpResponse {
  headersSent?: boolean;
  status(code: number): {
    json(body: ApiError): void;
  };
}

function isHttpResponse(val: unknown): val is HttpResponse {
  return isRecord(val) && typeof val['status'] === 'function';
}

// A status with no code of its own gets the code that fits it.
function codeForStatus(status: number): ErrorCode {
  switch (status) {
    case HttpStatus.BAD_REQUEST:
    case HttpStatus.PAYLOAD_TOO_LARGE:
      return 'invalid_input';
    case HttpStatus.UNAUTHORIZED:
      return 'not_signed_in';
    case HttpStatus.FORBIDDEN:
      return 'not_allowed';
    case HttpStatus.NOT_FOUND:
      return 'not_found';
    case HttpStatus.TOO_MANY_REQUESTS:
      return 'rate_limited';
    default:
      return 'unknown';
  }
}

/**
 * The one place an error becomes an answer: always the ApiError shape from core, with our words.
 * Database errors map to our codes by Postgres code and constraint (pg-errors.ts). Logs carry the error's
 * kind and Postgres code only, never the message, query values or anything a customer typed (rule 12).
 */
@Catch()
export class ApiExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger('Error');

  catch(exception: unknown, host: ArgumentsHost): void {
    const rawResponse = host.switchToHttp().getResponse<unknown>();
    if (!isHttpResponse(rawResponse) || rawResponse.headersSent) return;

    let status: number = HttpStatus.INTERNAL_SERVER_ERROR;
    let code: ErrorCode = 'unknown';
    let fieldErrors: Record<string, string[]> | undefined = undefined;

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const res = exception.getResponse();
      if (isRecord(res)) {
        if (typeof res['code'] === 'string' && isErrorCode(res['code'])) code = res['code'];
        if (isFieldErrors(res['fieldErrors'])) fieldErrors = res['fieldErrors'];
      }
      if (code === 'unknown') code = codeForStatus(status);
    } else {
      const mapped = mapDbError(exception, isErrorCode);
      if (mapped) {
        status = mapped.status;
        code = mapped.code;
      }
    }

    if (code === 'unknown' || status >= 500) {
      const pg = pgErrorOf(exception);
      const kind = exception instanceof Error ? exception.name : typeof exception;
      this.logger.error(
        `${status} ${kind}${pg ? ` pg=${pg.code}${pg.constraint ? ` constraint=${pg.constraint}` : ''}` : ''}`,
      );
    }

    const errorBody: ApiError = {
      status,
      code,
      message: errorWords(code),
      ...(fieldErrors ? { fieldErrors } : {}),
    };

    rawResponse.status(status).json(errorBody);
  }
}
