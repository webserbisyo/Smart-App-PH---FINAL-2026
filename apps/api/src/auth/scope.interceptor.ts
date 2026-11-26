import {
  Inject,
  Injectable,
  type CallHandler,
  type ExecutionContext,
  type NestInterceptor,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Reflector } from '@nestjs/core';
import { needsShop, roleAllows, ShopRoleEnum } from '@smartapp/core';
import { eq, sql } from 'drizzle-orm';
import type { Request } from 'express';
import { z } from 'zod';
import { from, lastValueFrom, type Observable } from 'rxjs';
import { ApiFailure, notFound } from '../common/api-failure.js';
import { Db } from '../db/db.service.js';
import { tenantMembers } from '../db/generated/schema.js';
import { callerOf } from './caller.js';
import { Can, NO_TRANSACTION_KEY } from './decorators.js';
import { readCookie, supportCookieName } from './session-cookies.js';
import type { ApiEnv } from '../env.js';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const HelpSchema = z.object({ id: z.string(), tenant_id: z.string() });
const WRITES = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

/**
 * Runs each route inside one database transaction as the caller (decision T116):
 * 1. opens the transaction with app.user_id set and the app_api role (app_admin for the founder's routes),
 * 2. finds the caller's shop in tenant_members (rule 12: never from the URL or body) and sets app.tenant_id,
 * 3. checks the role allows the route's permission,
 * 4. runs the handler, and commits before the answer is sent.
 * No shop, or the founder's routes for anyone else, answers Not found (rule 12).
 *
 * Help mode (T91, D8): a Super Admin with an open support session (its cookie, looked up for that same login)
 * runs the shop's routes as the shop's owner, still as app_api, and every write is logged in audit_log.
 */
@Injectable()
export class ScopeInterceptor implements NestInterceptor {
  private readonly supportCookie: string;

  constructor(
    @Inject(Reflector) private readonly reflector: Reflector,
    @Inject(Db) private readonly db: Db,
    @Inject(ConfigService) config: ConfigService,
  ) {
    this.supportCookie = supportCookieName(config.get<ApiEnv>('APP_ENV') ?? 'development');
  }

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    if (context.getType() !== 'http') return next.handle();
    const targets = [context.getHandler(), context.getClass()];
    if (this.reflector.getAllAndOverride<boolean>(NO_TRANSACTION_KEY, targets) === true) {
      return next.handle();
    }
    const permission = this.reflector.getAllAndOverride(Can, targets);
    const request = context.switchToHttp().getRequest<Request>();
    const caller = callerOf(request);
    const user = caller.user;
    const admin = permission === 'platform:admin';

    return from(
      (async () => {
        const help =
          !admin && permission && user?.isAdmin ? await this.openSupport(request, user.id) : null;
        return this.db.run(
          {
            userId: user?.id ?? null,
            shopId: null,
            role: admin ? 'admin' : 'api',
            supportSessionId: help?.id ?? null,
          },
          async () => {
            if (admin && !user?.isAdmin) throw notFound();
            if (help && permission) {
              if (!roleAllows('owner', permission)) throw new ApiFailure('not_allowed', 403);
              await this.db.useShop(help.tenant_id);
              caller.shop = { id: help.tenant_id, role: 'owner' };
              const result: unknown = await lastValueFrom(next.handle(), {
                defaultValue: undefined,
              });
              if (WRITES.has(request.method)) {
                const route: unknown = Reflect.get(request, 'route');
                const path =
                  typeof route === 'object' && route !== null ? Reflect.get(route, 'path') : null;
                await this.db.tx.execute(sql`
                insert into public.audit_log (actor_user_id, tenant_id, support_session_id, action, target)
                values (${user?.id ?? null}::uuid, ${help.tenant_id}::uuid, ${help.id}::uuid,
                  ${`help.${request.method.toLowerCase()}`}, ${typeof path === 'string' ? path.slice(0, 200) : null})`);
              }
              return result;
            }
            if (permission && user && needsShop(permission)) {
              const [member] = await this.db.tx
                .select({ tenantId: tenantMembers.tenantId, role: tenantMembers.role })
                .from(tenantMembers)
                .where(eq(tenantMembers.userId, user.id))
                .limit(1);
              if (!member) throw notFound();
              const role = ShopRoleEnum.parse(member.role);
              if (!roleAllows(role, permission)) throw new ApiFailure('not_allowed', 403);
              await this.db.useShop(member.tenantId);
              caller.shop = { id: member.tenantId, role };
            }
            return lastValueFrom(next.handle(), { defaultValue: undefined });
          },
        );
      })(),
    );
  }

  /** The caller's own open support session from its cookie, or null (an ended or someone else's is ignored). */
  private async openSupport(
    request: Request,
    userId: string,
  ): Promise<{ id: string; tenant_id: string } | null> {
    const id = readCookie(request.headers.cookie, this.supportCookie);
    if (!id || !UUID.test(id)) return null;
    const rows = await this.db.run({ userId, shopId: null, role: 'admin' }, async () => {
      const result = await this.db.tx.execute(sql`
        select id, tenant_id from public.support_sessions
        where id = ${id}::uuid and admin_user_id = ${userId}::uuid and ended_at is null and ends_at > now()`);
      return z.array(HelpSchema).parse(result.rows);
    });
    return rows[0] ?? null;
  }
}
