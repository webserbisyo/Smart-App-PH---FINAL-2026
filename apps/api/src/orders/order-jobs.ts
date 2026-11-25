import { Inject, Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { and, eq, isNotNull, isNull, lt, sql } from 'drizzle-orm';
import { z } from 'zod';
import { Db, type TxScope } from '../db/db.service.js';
import { mediaFiles } from '../db/generated/schema.js';
import { JobsService } from '../jobs/jobs.service.js';
import { MediaService } from '../media/media.service.js';
import { OrderSteps } from './order-steps.service.js';

const ADMIN: TxScope = { userId: null, shopId: null, role: 'admin' };
const EXPIRE_BATCH = 200;
// Payment photos are kept 30 days, then the photo goes and the payment row stays (A-mvp, phase 5 task 6).
export const PROOF_KEEP_DAYS = 30;
const PROOF_BATCH = 200;

const DueSchema = z.array(z.object({ id: z.string(), tenant_id: z.string() }));

/**
 * The order area's timed jobs (phase 5 task 6, D5). Each runs as app_admin across shops; an order's own
 * step still locks its row and checks the rule again, so a payment photo that arrives at the last second
 * wins over the expiry.
 */
@Injectable()
export class OrderJobs {
  private readonly logger = new Logger('OrderJobs');

  constructor(
    @Inject(Db) private readonly db: Db,
    @Inject(JobsService) private readonly jobs: JobsService,
    @Inject(OrderSteps) private readonly steps: OrderSteps,
    @Inject(MediaService) private readonly media: MediaService,
  ) {}

  /**
   * Every minute: an unpaid GCash, Maya, bank or QR Ph order past its pay-by time with no photo waiting
   * expires, and gives back its counts once. One transaction per order, so one bad order never holds the rest.
   */
  @Cron(CronExpression.EVERY_MINUTE)
  async expireUnpaid(): Promise<number> {
    if (this.jobs.isStopping()) return 0;
    let due: z.infer<typeof DueSchema> = [];
    const found = await this.jobs.runLocked('orders-expire', async () => {
      const result = await this.db.tx.execute(sql`
        select id, tenant_id from public.orders
        where payment_status = 'unpaid' and status = 'placed' and pay_by < now()
        order by pay_by
        limit ${EXPIRE_BATCH}`);
      due = DueSchema.parse(result.rows);
    });
    if (found !== 'done') return 0;
    let expired = 0;
    for (const order of due) {
      if (this.jobs.isStopping()) break;
      try {
        const done = await this.db.run({ ...ADMIN, shopId: order.tenant_id }, () =>
          this.steps.expire(order.id),
        );
        if (done) expired++;
      } catch (error) {
        this.logger.warn(
          `Expiry skipped one order: ${error instanceof Error ? error.name : 'error'}`,
        );
      }
    }
    if (expired > 0) this.logger.log(`Expired ${expired} unpaid orders`);
    return expired;
  }

  /** Daily, 3:30 AM Manila: payment photos older than 30 days leave Storage; the payment rows stay. */
  @Cron('30 3 * * *', { timeZone: 'Asia/Manila' })
  async removeOldProofs(): Promise<void> {
    await this.jobs.runLocked('proofs-old', async () => {
      const old = await this.db.tx
        .select({ id: mediaFiles.id, bucket: mediaFiles.bucket, path: mediaFiles.path })
        .from(mediaFiles)
        .where(
          and(
            eq(mediaFiles.kind, 'proof'),
            isNull(mediaFiles.deletedAt),
            isNotNull(mediaFiles.confirmedAt),
            lt(mediaFiles.confirmedAt, sql`now() - make_interval(days => ${PROOF_KEEP_DAYS})`),
          ),
        )
        .limit(PROOF_BATCH);
      await this.media.deleteFiles(old);
      if (old.length > 0) this.logger.log(`Removed ${old.length} old payment photos`);
    });
  }
}
