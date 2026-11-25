import {
  Inject,
  Injectable,
  type CallHandler,
  type ExecutionContext,
  type NestInterceptor,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { needsShop, roleAllows, ShopRoleEnum } from '@smartapp/core';
import { eq } from 'drizzle-orm';
import { from, lastValueFrom, type Observable } from 'rxjs';
import { ApiFailure, notFound } from '../common/api-failure.js';
import { Db } from '../db/db.service.js';
import { tenantMembers } from '../db/generated/schema.js';
import { callerOf } from './caller.js';
import { Can, NO_TRANSACTION_KEY } from './decorators.js';

/**
 * Runs each route inside one database transaction as the caller (decision T116):
 * 1. opens the transaction with app.user_id set and the app_api role (app_admin for the founder's routes),
 * 2. finds the caller's shop in tenant_members (rule 12: never from the URL or body) and sets app.tenant_id,
 * 3. checks the role allows the route's permission,
 * 4. runs the handler, and commits before the answer is sent.
 * No shop, or the founder's routes for anyone else, answers Not found (rule 12).
 */
@Injectable()
export class ScopeInterceptor implements NestInterceptor {
  constructor(
    @Inject(Reflector) private readonly reflector: Reflector,
    @Inject(Db) private readonly db: Db,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    if (context.getType() !== 'http') return next.handle();
    const targets = [context.getHandler(), context.getClass()];
    if (this.reflector.getAllAndOverride<boolean>(NO_TRANSACTION_KEY, targets) === true) {
      return next.handle();
    }
    const permission = this.reflector.getAllAndOverride(Can, targets);
    const caller = callerOf(context.switchToHttp().getRequest<object>());
    const user = caller.user;
    const admin = permission === 'platform:admin';

    return from(
      this.db.run(
        { userId: user?.id ?? null, shopId: null, role: admin ? 'admin' : 'api' },
        async () => {
          if (admin && !user?.isAdmin) throw notFound();
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
      ),
    );
  }
}
