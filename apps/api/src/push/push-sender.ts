import { sendNotification, WebPushError } from 'web-push';

/** Where one push goes: a phone's or laptop's subscription, as the browser gave it. */
export interface PushTarget {
  endpoint: string;
  p256dh: string;
  auth: string;
}

export interface PushSendOptions {
  /** Seconds the push service keeps it while the phone is off (order status 1 hour, R5). */
  ttl: number;
  urgency: 'normal' | 'high';
  /** A newer push with the same topic replaces one still waiting on the phone (the order id). */
  topic: string | null;
}

/** `sent`; `gone` = the phone dropped it (404 or 410), so the subscription is deleted; `retry` = try later. */
export type PushResult = 'sent' | 'gone' | 'retry';

/**
 * Sends one push (launch phase 5, section 5). An abstract class so Nest can inject it by type: the real one
 * signs with the platform VAPID keys (Q5); without keys (a laptop, a test) the recording one stands in.
 */
export abstract class PushSender {
  /** The public key the browser subscribes with; null when pushes are only recorded. */
  abstract readonly publicKey: string | null;
  abstract send(target: PushTarget, body: string, options: PushSendOptions): Promise<PushResult>;
}

export interface VapidKeys {
  subject: string;
  publicKey: string;
  privateKey: string;
}

// A push service that hangs never holds the sender for long.
const SEND_TIMEOUT_MS = 10_000;

export class WebPushSender extends PushSender {
  readonly publicKey: string;

  constructor(private readonly keys: VapidKeys) {
    super();
    this.publicKey = keys.publicKey;
  }

  async send(target: PushTarget, body: string, options: PushSendOptions): Promise<PushResult> {
    try {
      await sendNotification(
        { endpoint: target.endpoint, keys: { p256dh: target.p256dh, auth: target.auth } },
        body,
        {
          vapidDetails: this.keys,
          TTL: options.ttl,
          urgency: options.urgency,
          ...(options.topic ? { topic: options.topic } : {}),
          timeout: SEND_TIMEOUT_MS,
        },
      );
      return 'sent';
    } catch (error) {
      if (error instanceof WebPushError && (error.statusCode === 404 || error.statusCode === 410)) {
        return 'gone';
      }
      return 'retry';
    }
  }
}

/** Keeps what would have gone out, for a laptop without keys and for the tests. */
export class RecordingPushSender extends PushSender {
  readonly publicKey = null;
  readonly sent: { target: PushTarget; body: string; options: PushSendOptions }[] = [];
  /** What the next sends answer (tests set `gone` or `retry`). */
  answer: PushResult = 'sent';

  send(target: PushTarget, body: string, options: PushSendOptions): Promise<PushResult> {
    if (this.answer === 'sent') this.sent.push({ target, body, options });
    return Promise.resolve(this.answer);
  }
}
