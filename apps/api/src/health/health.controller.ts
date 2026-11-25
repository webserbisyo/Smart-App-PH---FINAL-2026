import { Controller, Get, Inject } from '@nestjs/common';
import {
  HealthCheck,
  HealthCheckService,
  HealthIndicatorService,
  type HealthCheckResult,
} from '@nestjs/terminus';
import { sql } from 'drizzle-orm';
import { words } from '@smartapp/core';
import { NoTransaction, Public } from '../auth/decorators.js';
import { Db } from '../db/db.service.js';

/**
 * `/health` answers while the process runs (Railway's check, so a slow database never restarts it);
 * `/health/ready` also runs one query through the same roles every request uses.
 */
@Controller('health')
export class HealthController {
  constructor(
    @Inject(HealthCheckService) private readonly health: HealthCheckService,
    @Inject(HealthIndicatorService) private readonly indicators: HealthIndicatorService,
    @Inject(Db) private readonly db: Db,
  ) {}

  @Get()
  @Public()
  @NoTransaction()
  live(): { ok: true; app: string } {
    return { ok: true, app: words.appName };
  }

  @Get('ready')
  @Public()
  @NoTransaction()
  @HealthCheck()
  ready(): Promise<HealthCheckResult> {
    return this.health.check([
      async () => {
        const indicator = this.indicators.check('database');
        try {
          await this.db.run({ userId: null, shopId: null, role: 'api' }, () =>
            this.db.tx.execute(sql`select 1`),
          );
          return indicator.up();
        } catch {
          return indicator.down({ reason: 'no answer' });
        }
      },
    ]);
  }
}
