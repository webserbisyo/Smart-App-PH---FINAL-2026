export interface EmailMessage {
  to: string;
  subject: string;
  text: string;
  html: string;
}

/** `sent`; `refused` = Resend will never take it (a bad address), so it is not tried again; `retry`. */
export type EmailResult = 'sent' | 'refused' | 'retry';

/**
 * Sends one email to an owner (launch phase 5, Q4). An abstract class so Nest injects it by type: Resend's
 * HTTPS API in Railway (mail ports are blocked there, R2), a recording one on a laptop and in tests.
 */
export abstract class EmailSender {
  abstract send(message: EmailMessage, idempotencyKey: string): Promise<EmailResult>;
}

const RESEND_URL = 'https://api.resend.com/emails';
const SEND_TIMEOUT_MS = 10_000;

export class ResendEmailSender extends EmailSender {
  constructor(
    private readonly apiKey: string,
    private readonly from: string,
  ) {
    super();
  }

  async send(message: EmailMessage, idempotencyKey: string): Promise<EmailResult> {
    try {
      const response = await fetch(RESEND_URL, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
          // A retry after a lost answer never sends the email twice.
          'Idempotency-Key': idempotencyKey,
        },
        body: JSON.stringify({
          from: this.from,
          to: [message.to],
          subject: message.subject,
          text: message.text,
          html: message.html,
        }),
        signal: AbortSignal.timeout(SEND_TIMEOUT_MS),
      });
      if (response.ok) return 'sent';
      // Too many at once, or Resend's own trouble: later. Anything else is about this email: give up.
      return response.status === 429 || response.status >= 500 ? 'retry' : 'refused';
    } catch {
      return 'retry';
    }
  }
}

/** Keeps what would have gone out, for a laptop without a key and for the tests. */
export class RecordingEmailSender extends EmailSender {
  readonly sent: EmailMessage[] = [];

  send(message: EmailMessage): Promise<EmailResult> {
    this.sent.push(message);
    return Promise.resolve('sent');
  }
}
