import { Inject, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { eq } from 'drizzle-orm';
import { Db } from '../db/db.service.js';
import { tenants } from '../db/generated/schema.js';

// The storefront answers in well under this; a slow one never holds anything up (it runs after the commit).
const TIMEOUT_MS = 5_000;

/** The cache tag the storefront gives every read of one shop (R8: `cacheTag('shop:<slug>')`). */
export function shopTag(slug: string): string {
  return `shop:${slug}`;
}

/**
 * Tells the storefront to read a shop's pages again after anything a customer sees changed (R8): a menu
 * save, Publish, a settings save. It runs once per transaction and only after the commit, so the storefront
 * never re-reads data that then rolls back. Prices, stock and open or closed are still checked fresh at
 * checkout (T6), so a missed call only means a page shows the old menu for a little while.
 */
@Injectable()
export class StorefrontCache {
  private readonly logger = new Logger('StorefrontCache');
  private readonly url: string | undefined;
  private readonly secret: string | undefined;
  private readonly marked = new WeakSet<object>();

  constructor(
    @Inject(Db) private readonly db: Db,
    @Inject(ConfigService) config: ConfigService,
  ) {
    this.url = config.get<string>('STOREFRONT_URL')?.replace(/\/+$/, '');
    this.secret = config.get<string>('STOREFRONT_REVALIDATE_SECRET');
  }

  /** The request's shop changed something its storefront shows. */
  async shopChanged(): Promise<void> {
    const tx = this.db.tx;
    if (this.marked.has(tx)) return;
    this.marked.add(tx);
    const [shop] = await tx
      .select({ slug: tenants.slug })
      .from(tenants)
      .where(eq(tenants.id, this.db.shopId));
    if (!shop) return;
    const tag = shopTag(shop.slug);
    this.db.afterCommit(() => this.revalidate([tag]));
  }

  private async revalidate(tags: string[]): Promise<void> {
    const url = this.url;
    const secret = this.secret;
    // A laptop without a storefront to tell: nothing to do.
    if (!url || !secret) return;
    const res = await fetch(`${url}/api/revalidate`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-revalidate-secret': secret },
      body: JSON.stringify({ tags }),
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    if (!res.ok) this.logger.warn(`Storefront revalidate answered ${res.status}`);
  }
}
