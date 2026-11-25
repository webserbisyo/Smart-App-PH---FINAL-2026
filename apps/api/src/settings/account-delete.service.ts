import { Inject, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { founderEmailWords, manilaDate } from '@smartapp/core';
import { sql } from 'drizzle-orm';
import type { CallerUser } from '../auth/caller.js';
import { ApiFailure, notFound } from '../common/api-failure.js';
import { Db, type TxScope } from '../db/db.service.js';
import { EmailSender } from '../email/email-sender.js';

const ADMIN: TxScope = { userId: null, shopId: null, role: 'admin' };

/**
 * Settings › Account › Delete account (api.md): no self-delete at launch. The founder gets an email with the
 * shop and the owner's login, and the request stays in the audit log (Super Admin reads it there). One email
 * per shop per Manila day, however many taps.
 */
@Injectable()
export class AccountDeleteService {
  private readonly logger = new Logger('Account');
  private readonly founder: string | undefined;
  private readonly dashboardUrl: string;

  constructor(
    @Inject(Db) private readonly db: Db,
    @Inject(EmailSender) private readonly sender: EmailSender,
    @Inject(ConfigService) config: ConfigService,
  ) {
    this.founder = config.get<string>('ADMIN_EMAIL')?.trim().toLowerCase() || undefined;
    const url = config.get<string>('DASHBOARD_URL') ?? 'http://localhost:5173';
    this.dashboardUrl = url.endsWith('/') ? url.slice(0, -1) : url;
  }

  async request(user: CallerUser): Promise<{ ok: true }> {
    const shopId = this.db.shopId;
    const [shop] = (
      await this.db.tx.execute<{ name: string; slug: string }>(
        sql`select name, slug from public.tenants where id = ${shopId}`,
      )
    ).rows;
    if (!shop) throw notFound();
    if (this.founder) {
      const w = founderEmailWords;
      const link = `${this.dashboardUrl}/admin/shops?shop=${shopId}`;
      const line = w.deleteLine(shop.name, shop.slug, user.email);
      const result = await this.sender.send(
        {
          to: this.founder,
          subject: w.deleteSubject(shop.name),
          text: `${line}\n\n${w.deleteNext}\n\n${w.open}: ${link}`,
          html: [
            `<p>${escapeHtml(line)}</p>`,
            `<p>${escapeHtml(w.deleteNext)}</p>`,
            `<p><a href="${escapeHtml(link)}">${escapeHtml(w.open)}</a></p>`,
          ].join(''),
        },
        `smartapp-delete-${shopId}-${manilaDate(new Date())}`,
      );
      // Resend is down: the owner tries again (nothing was promised yet).
      if (result === 'retry') throw new ApiFailure('unknown', 503);
    } else {
      this.logger.warn(
        'Account delete request: ADMIN_EMAIL is not set, kept in the audit log only',
      );
    }
    const userId = user.id;
    this.db.afterCommit(async () => {
      await this.db.run(ADMIN, async () => {
        await this.db.tx.execute(sql`
          insert into public.audit_log (actor_user_id, tenant_id, action, target)
          values (${userId}::uuid, ${shopId}::uuid, 'account.delete_request', ${`tenants:${shopId}`})`);
      });
    });
    return { ok: true };
  }
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
