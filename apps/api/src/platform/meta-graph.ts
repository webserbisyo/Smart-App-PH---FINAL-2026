/** One event in Meta's Conversions API shape (developers.facebook.com, Server Event parameters). */
export interface MetaServerEvent {
  event_name: string;
  event_time: number;
  event_id: string;
  action_source: string;
  event_source_url?: string;
  user_data: Record<string, string | string[]>;
  custom_data?: { currency: string; value: number };
}

/**
 * Meta's answer, read only for what we act on:
 * `sent`; `token` = the access token is expired or wrong (stop and tell the founder); `rejected` = Meta will
 * never take this event (a bad field), so it is not tried again; `retry` = Meta's own trouble or a timeout.
 */
export type MetaResult =
  | { kind: 'sent'; fbtraceId: string | null }
  | { kind: 'token' | 'rejected' | 'retry'; fbtraceId: string | null };

/**
 * Sends one event to Meta (T118: one event per request, so one bad event never takes others down). An
 * abstract class so Nest injects it by type: the Graph API in Railway, a recording one on a laptop and in tests.
 */
export abstract class MetaGraph {
  abstract readonly connected: boolean;
  abstract send(event: MetaServerEvent, testCode: string | null): Promise<MetaResult>;
}

const SEND_TIMEOUT_MS = 10_000;

function fbtraceOf(body: unknown): string | null {
  if (typeof body !== 'object' || body === null) return null;
  const direct: unknown = Reflect.get(body, 'fbtrace_id');
  if (typeof direct === 'string') return direct.slice(0, 100);
  const error: unknown = Reflect.get(body, 'error');
  if (typeof error === 'object' && error !== null) {
    const nested: unknown = Reflect.get(error, 'fbtrace_id');
    if (typeof nested === 'string') return nested.slice(0, 100);
  }
  return null;
}

function errorCodeOf(body: unknown): number | null {
  if (typeof body !== 'object' || body === null) return null;
  const error: unknown = Reflect.get(body, 'error');
  if (typeof error !== 'object' || error === null) return null;
  const code: unknown = Reflect.get(error, 'code');
  return typeof code === 'number' ? code : null;
}

export class HttpMetaGraph extends MetaGraph {
  readonly connected = true;

  constructor(
    private readonly pixelId: string,
    private readonly token: string,
    private readonly version: string,
  ) {
    super();
  }

  async send(event: MetaServerEvent, testCode: string | null): Promise<MetaResult> {
    try {
      const response = await fetch(
        `https://graph.facebook.com/${this.version}/${this.pixelId}/events`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          // The token goes in the body, never in the address (addresses end up in logs).
          body: JSON.stringify({
            data: [event],
            access_token: this.token,
            ...(testCode ? { test_event_code: testCode } : {}),
          }),
          signal: AbortSignal.timeout(SEND_TIMEOUT_MS),
        },
      );
      const body: unknown = await response.json().catch(() => null);
      const fbtraceId = fbtraceOf(body);
      if (response.ok) return { kind: 'sent', fbtraceId };
      // 190: the token expired or was taken back; 102 and 463 are other token answers.
      const code = errorCodeOf(body);
      if (code === 190 || code === 102 || code === 463 || response.status === 401)
        return { kind: 'token', fbtraceId };
      if (response.status === 429 || response.status >= 500) return { kind: 'retry', fbtraceId };
      return { kind: 'rejected', fbtraceId };
    } catch {
      return { kind: 'retry', fbtraceId: null };
    }
  }
}

/** Keeps what would have gone out: a laptop without a token, and the tests (which set the next answers). */
export class RecordingMetaGraph extends MetaGraph {
  readonly sent: { event: MetaServerEvent; testCode: string | null }[] = [];
  readonly answers: MetaResult['kind'][] = [];

  constructor(readonly connected: boolean = false) {
    super();
  }

  send(event: MetaServerEvent, testCode: string | null): Promise<MetaResult> {
    const kind = this.answers.shift() ?? 'sent';
    if (kind === 'sent') this.sent.push({ event, testCode });
    return Promise.resolve({ kind, fbtraceId: kind === 'sent' ? 'recorded' : null });
  }
}
