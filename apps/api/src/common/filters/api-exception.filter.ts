import {
  Catch,
  HttpException,
  HttpStatus,
  type ArgumentsHost,
  type ExceptionFilter,
} from '@nestjs/common';
import { errorWords, ErrorCodeEnum, type ApiError } from '@smartapp/core';

function isRecord(val: unknown): val is Record<string, unknown> {
  return typeof val === 'object' && val !== null;
}

function isFieldErrors(val: unknown): val is Record<string, string[]> {
  if (!isRecord(val)) return false;
  return Object.values(val).every(
    (arr) => Array.isArray(arr) && arr.every((item) => typeof item === 'string'),
  );
}

interface HttpResponse {
  status(code: number): {
    json(body: ApiError): void;
  };
}

function isHttpResponse(val: unknown): val is HttpResponse {
  return isRecord(val) && typeof val['status'] === 'function';
}

@Catch()
export class ApiExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const rawResponse = ctx.getResponse();

    if (!isHttpResponse(rawResponse)) {
      return;
    }

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let code: ApiError['code'] = 'unknown';
    let message = errorWords('unknown');
    let fieldErrors: Record<string, string[]> | undefined = undefined;

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const res = exception.getResponse();

      if (isRecord(res)) {
        if (typeof res['code'] === 'string') {
          const parsedCode = ErrorCodeEnum.safeParse(res['code']);
          if (parsedCode.success) {
            code = parsedCode.data;
          }
        }
        if (typeof res['message'] === 'string') {
          message = res['message'];
        }
        if (isFieldErrors(res['fieldErrors'])) {
          fieldErrors = res['fieldErrors'];
        }
      }

      if (code === 'unknown') {
        if (status === HttpStatus.BAD_REQUEST) {
          code = 'invalid_input';
          message = errorWords('invalid_input');
        } else if (status === HttpStatus.UNAUTHORIZED) {
          code = 'not_signed_in';
          message = errorWords('not_signed_in');
        }
      }
    }

    const errorBody: ApiError = {
      status,
      code,
      message,
      ...(fieldErrors ? { fieldErrors } : {}),
    };

    rawResponse.status(status).json(errorBody);
  }
}
