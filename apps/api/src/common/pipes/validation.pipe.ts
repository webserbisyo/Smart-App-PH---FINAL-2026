import { BadRequestException, StandardSchemaValidationPipe } from '@nestjs/common';
import { errorWords } from '@smartapp/core';

export function createStandardSchemaValidationPipe(): StandardSchemaValidationPipe {
  return new StandardSchemaValidationPipe({
    transform: true,
    exceptionFactory: (issues) => {
      const fieldErrors: Record<string, string[]> = {};
      for (const issue of issues) {
        const path =
          issue.path && issue.path.length > 0
            ? issue.path
                .map((segment) =>
                  String(
                    typeof segment === 'object' && segment !== null && 'key' in segment
                      ? segment.key
                      : segment,
                  ),
                )
                .join('.')
            : 'root';

        const list = fieldErrors[path] ?? [];
        list.push(issue.message);
        fieldErrors[path] = list;
      }

      return new BadRequestException({
        status: 400,
        code: 'invalid_input',
        message: errorWords('invalid_input'),
        fieldErrors,
      });
    },
  });
}
