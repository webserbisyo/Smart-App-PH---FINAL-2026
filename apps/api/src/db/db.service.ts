import { AsyncLocalStorage } from 'node:async_hooks';
import { Inject, Injectable } from '@nestjs/common';
import { sql } from 'drizzle-orm';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import type * as schema from './generated/schema.js';
import { isRetryableDbError } from './pg-errors.js';

export const DRIZZLE = Symbol('DRIZZLE');
export const PG_POOL = Symbol('PG_POOL');

export type Database = NodePgDatabase<typeof schema>;
export type Tx = Parameters<Parameters<Database['transaction']>[0]>[0];

/**
 * Who a transaction runs as (decision T116). `api` is every shop route (RLS keeps it to `shopId`);
 * `admin` is the founder's Super Admin and the timed jobs.
 */
export interface TxScope {
  userId: string | null;
  shopId: string | null;
  role: 'api' | 'admin';
}

interface TxStore {
  tx: Tx;
  scope: TxScope;
}

// A runaway query never holds a pooled connection for long (jobs included).
const STATEMENT_TIMEOUT = '15s';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * The only way into the database. Every query runs inside `run()`, which opens one transaction, sets
 * `app.user_id` and `app.tenant_id` with `set_config(..., true)` and drops to `app_api` (or `app_admin`) with
 * `set local role`, so RLS applies and nothing leaks to the next request on the pooled connection
 * (transaction pooling, R2). Outside `run()` there is no connection to use: `tx` throws.
 */
@Injectable()
export class Db {
  private readonly store = new AsyncLocalStorage<TxStore>();

  constructor(@Inject(DRIZZLE) private readonly root: Database) {}

  /** The current transaction. Routes get one from ScopeInterceptor, jobs from `run`. */
  get tx(): Tx {
    return this.current().tx;
  }

  get scope(): TxScope {
    return this.current().scope;
  }

  /** The request's shop; throws when the route has none (a bug, not a user error). */
  get shopId(): string {
    const id = this.current().scope.shopId;
    if (!id) throw new Error('This transaction has no shop.');
    return id;
  }

  get userId(): string {
    const id = this.current().scope.userId;
    if (!id) throw new Error('This transaction has no signed-in user.');
    return id;
  }

  inTransaction(): boolean {
    return this.store.getStore() !== undefined;
  }

  async run<T>(scope: TxScope, fn: () => Promise<T>): Promise<T> {
    if (this.inTransaction()) throw new Error('Db.run cannot nest; use db.tx.');
    for (const id of [scope.userId, scope.shopId]) {
      if (id !== null && !UUID.test(id)) throw new Error('Scope ids must be uuids.');
    }
    // One retry for a deadlock or serialization failure; anything else goes to the error filter.
    for (let attempt = 0; ; attempt++) {
      try {
        return await this.root.transaction(async (tx) => {
          await tx.execute(
            sql`select set_config('app.user_id', ${scope.userId ?? ''}, true), set_config('app.tenant_id', ${scope.shopId ?? ''}, true), set_config('statement_timeout', ${STATEMENT_TIMEOUT}, true)`,
          );
          await tx.execute(
            scope.role === 'admin' ? sql`set local role app_admin` : sql`set local role app_api`,
          );
          return this.store.run({ tx, scope: { ...scope } }, fn);
        });
      } catch (error) {
        if (attempt === 0 && isRetryableDbError(error)) continue;
        throw error;
      }
    }
  }

  /** Switches the shop inside the current transaction (sign-up makes a shop, then acts as it). */
  async useShop(shopId: string): Promise<void> {
    if (!UUID.test(shopId)) throw new Error('Scope ids must be uuids.');
    const store = this.current();
    await store.tx.execute(sql`select set_config('app.tenant_id', ${shopId}, true)`);
    store.scope = { ...store.scope, shopId };
  }

  private current(): TxStore {
    const store = this.store.getStore();
    if (!store) {
      throw new Error('No database transaction here: routes get one from ScopeInterceptor.');
    }
    return store;
  }
}
