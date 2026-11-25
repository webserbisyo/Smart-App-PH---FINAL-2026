import { timingSafeEqual } from 'node:crypto';
import { revalidateTag } from 'next/cache';
import { revalidateSecret } from '@/server/env';

const TAG = /^shop:[a-z0-9]+(-[a-z0-9]+)*$/;
const MAX_TAGS = 20;

function sameText(a: string, b: string): boolean {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  return left.length === right.length && timingSafeEqual(left, right);
}

function tagsOf(body: unknown): string[] | null {
  if (typeof body !== 'object' || body === null || !('tags' in body)) return null;
  const { tags } = body;
  if (!Array.isArray(tags) || tags.length === 0 || tags.length > MAX_TAGS) return null;
  const valid = tags.filter((tag): tag is string => typeof tag === 'string' && TAG.test(tag));
  return valid.length === tags.length ? valid : null;
}

/**
 * NestJS asks for a shop's cached pages to be read again after a change customers see (launch phase 4/5,
 * R8). Only with the shared secret; the old pages keep showing while the new ones are read ('max').
 */
export async function POST(request: Request): Promise<Response> {
  const sent = request.headers.get('x-revalidate-secret');
  if (!revalidateSecret || !sent || !sameText(sent, revalidateSecret)) {
    return new Response(null, { status: 404 });
  }
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return new Response(null, { status: 400 });
  }
  const tags = tagsOf(body);
  if (!tags) return new Response(null, { status: 400 });
  for (const tag of tags) revalidateTag(tag, 'max');
  return Response.json({ ok: true });
}
