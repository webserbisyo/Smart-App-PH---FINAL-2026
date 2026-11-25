import { createParamDecorator, SetMetadata, type ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Permission } from '@smartapp/core';
import { notFound, notSignedIn } from '../common/api-failure.js';
import { callerOf, type CallerShop, type CallerUser } from './caller.js';

/** Anyone may call it (a signed-in caller is still recognised when a session is there). */
export const IS_PUBLIC_KEY = 'isPublic';
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);

/** Needs a signed-in caller with this permission (a closed list in core, decision T116). */
export const Can = Reflector.createDecorator<Permission>();

/** The route never touches the database (auth calls to Supabase, liveness): no transaction is opened. */
export const NO_TRANSACTION_KEY = 'noTransaction';
export const NoTransaction = () => SetMetadata(NO_TRANSACTION_KEY, true);

function requestOf(ctx: ExecutionContext): object {
  return ctx.switchToHttp().getRequest<object>();
}

/** The signed-in person on a @Can route. */
export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): CallerUser => {
    const user = callerOf(requestOf(ctx)).user;
    if (!user) throw notSignedIn();
    return user;
  },
);

/** The signed-in person or null, for @Public routes that answer both. */
export const MaybeUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): CallerUser | null => callerOf(requestOf(ctx)).user,
);

/** The caller's shop on a route whose permission needs one. */
export const CurrentShop = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): CallerShop => {
    const shop = callerOf(requestOf(ctx)).shop;
    if (!shop) throw notFound();
    return shop;
  },
);
