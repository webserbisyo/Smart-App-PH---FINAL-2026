// What a service worker shows for a push (launch phase 5, X9). The API sends the Declarative Web Push shape
// (R5); older pushes used a flat { title, body, url }. Anything unreadable still shows a notice: an iPhone
// drops a subscription whose push shows nothing (R4).

export interface ShownPush {
  title: string;
  body: string;
  /** A path on the worker's own address, so the backup address opens its own copy. */
  path: string;
  tag: string | undefined;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function text(value: unknown, max: number): string | null {
  return typeof value === 'string' && value.trim() !== '' ? value.slice(0, max) : null;
}

/** A same-site path from an absolute link or a path; never another site's address. */
export function pushPath(value: unknown): string | null {
  if (typeof value !== 'string' || value === '') return null;
  if (value.startsWith('/') && !value.startsWith('//')) return value;
  try {
    const url = new URL(value);
    if (url.protocol !== 'https:' && url.protocol !== 'http:') return null;
    return `${url.pathname}${url.search}`;
  } catch {
    return null;
  }
}

export function readPushMessage(
  value: unknown,
  fallback: { title: string; body: string },
): ShownPush {
  const shape = isRecord(value) && isRecord(value.notification) ? value.notification : value;
  if (!isRecord(shape)) return { ...fallback, path: '/', tag: undefined };
  return {
    title: text(shape.title, 80) ?? fallback.title,
    body: text(shape.body, 240) ?? fallback.body,
    path: pushPath(shape.navigate) ?? pushPath(shape.url) ?? '/',
    tag: text(shape.tag, 64) ?? undefined,
  };
}
