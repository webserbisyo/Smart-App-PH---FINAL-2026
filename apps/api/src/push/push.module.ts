import { Global, Logger, Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EmailOutbox } from '../email/email-outbox.service.js';
import { EmailSender, RecordingEmailSender, ResendEmailSender } from '../email/email-sender.js';
import { PushController } from './push.controller.js';
import { PushDelivery } from './push-delivery.service.js';
import { PushOutbox } from './push-outbox.service.js';
import { PushSender, RecordingPushSender, WebPushSender } from './push-sender.js';
import { PushSubscriptions } from './push-subscriptions.service.js';

/**
 * Pushes and the owner's emails (launch phase 5, section 5, Q2, Q4). Global, so every area that changes an
 * order can queue them. Staging and production refuse to start without the keys (env.ts); a laptop or a test
 * without them records what would have gone out.
 */
@Global()
@Module({
  controllers: [PushController],
  providers: [
    {
      provide: PushSender,
      inject: [ConfigService],
      useFactory: (config: ConfigService): PushSender => {
        const publicKey = config.get<string>('VAPID_PUBLIC_KEY');
        const privateKey = config.get<string>('VAPID_PRIVATE_KEY');
        const subject = config.get<string>('VAPID_SUBJECT');
        if (publicKey && privateKey && subject) {
          return new WebPushSender({ subject, publicKey, privateKey });
        }
        new Logger('Push').log('No push keys: pushes are recorded, not sent.');
        return new RecordingPushSender();
      },
    },
    {
      provide: EmailSender,
      inject: [ConfigService],
      useFactory: (config: ConfigService): EmailSender => {
        const key = config.get<string>('RESEND_API_KEY');
        const from = config.get<string>('EMAIL_FROM');
        if (key && from) return new ResendEmailSender(key, from);
        new Logger('Email').log('No Resend key: emails are recorded, not sent.');
        return new RecordingEmailSender();
      },
    },
    PushDelivery,
    PushOutbox,
    PushSubscriptions,
    EmailOutbox,
  ],
  exports: [PushOutbox, PushSubscriptions, PushDelivery, PushSender, EmailOutbox],
})
export class PushModule {}
