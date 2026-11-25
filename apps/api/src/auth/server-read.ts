import { timingSafeEqual } from 'node:crypto';
import type { ExecutionContext } from '@nestjs/common';
import type { Request } from 'express';

/** The header the storefront's server reads carry (launch phase 5). */
export const SERVER_READ_HEADER = 'x-server-read';

/** True when the two texts match, in time that does not depend on where they differ. */
function sameText(a: string, b: string): boolean {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  return left.length === right.length && timingSafeEqual(left, right);
}

/**
 * The rate limit's skip rule: a call from the storefront's server (it renders every customer's page from a
 * few addresses) carries the shared secret. Without a secret set, nothing skips.
 */
export function serverReadSkip(secret: string | undefined): (context: ExecutionContext) => boolean {
  return (context) =>
    context.getType() === 'http' &&
    isServerRead(context.switchToHttp().getRequest<Request>().headers[SERVER_READ_HEADER], secret);
}

/** The header's value matches the secret (never when no secret is set). */
export function isServerRead(sent: unknown, secret: string | undefined): boolean {
  return !!secret && typeof sent === 'string' && sameText(sent, secret);
}
