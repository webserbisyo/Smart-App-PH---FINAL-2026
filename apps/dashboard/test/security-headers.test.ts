// The dashboard's security headers on Vercel (T118 task 8.4). Its one inline script (the appearance before
// the first paint) runs only because its hash is in the policy: change the script, and this test says to
// change the hash too.
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { z } from 'zod';

const root = new URL('../', import.meta.url);
const VercelSchema = z.object({
  headers: z.array(
    z.object({
      source: z.string(),
      headers: z.array(z.object({ key: z.string(), value: z.string() })),
    }),
  ),
});

function policy(): Map<string, string> {
  const raw: unknown = JSON.parse(readFileSync(new URL('vercel.json', root), 'utf8'));
  const all = VercelSchema.parse(raw).headers.find((h) => h.source === '/(.*)');
  return new Map((all?.headers ?? []).map((h) => [h.key, h.value]));
}

describe('dashboard security headers', () => {
  it('allows the inline appearance script by its hash, and no other inline script', () => {
    const html = readFileSync(new URL('index.html', root), 'utf8');
    const inline = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map((m) => m[1] ?? '');
    expect(inline).toHaveLength(1);
    const hash = createHash('sha256')
      .update(inline[0] ?? '', 'utf8')
      .digest('base64');
    const csp = policy().get('Content-Security-Policy') ?? '';
    expect(csp).toContain(`'sha256-${hash}'`);
    expect(csp).not.toContain("script-src 'self' 'unsafe-inline'");
    expect(csp).toContain("frame-ancestors 'none'");
  });

  it('sends the other headers', () => {
    const headers = policy();
    expect(headers.get('X-Content-Type-Options')).toBe('nosniff');
    expect(headers.get('Strict-Transport-Security')).toMatch(/max-age=\d{8}/);
    expect(headers.get('Referrer-Policy')).toBe('strict-origin-when-cross-origin');
  });
});
