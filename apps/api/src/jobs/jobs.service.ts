import { Inject, Injectable, Logger } from '@nestjs/common';
import { sql } from 'drizzle-orm';
import { Db } from '../db/db.service.js';

export type JobOutcome = 'done' | 'skipped' | 'failed';

/**
 * Timed jobs (D5, @nestjs/schedule). Each run takes a transaction-level advisory lock named after the job
 * (R3: session locks do not survive the transaction pooler), so two API copies never run the same job at
 * once; the second one skips. Jobs run as app_admin, because they work across shops.
 */
@Injectable()
export class JobsService {
  private readonly logger = new Logger('Jobs');
  private stopping = false;

  constructor(@Inject(Db) private readonly db: Db) {}

  /** Called on shutdown: runs already started finish, new ones skip. */
  stop(): void {
    this.stopping = true;
  }

  isStopping(): boolean {
    return this.stopping;
  }

  async runLocked(name: string, fn: () => Promise<void>): Promise<JobOutcome> {
    if (this.stopping) return 'skipped';
    try {
      return await this.db.run({ userId: null, shopId: null, role: 'admin' }, async () => {
        const result = await this.db.tx.execute<{ got: boolean }>(
          sql`select pg_try_advisory_xact_lock(hashtext(${`job:${name}`})) as got`,
        );
        if (result.rows[0]?.got !== true) return 'skipped';
        await fn();
        return 'done';
      });
    } catch (error) {
      this.logger.error(`Job ${name} failed: ${error instanceof Error ? error.name : 'error'}`);
      return 'failed';
    }
  }
}
