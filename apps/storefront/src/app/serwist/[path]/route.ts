import { spawnSync } from 'node:child_process';
import { createSerwistRoute } from '@serwist/turbopack';
import { vercelCommit } from '@/env';

// The offline page's precache revision: this commit (git locally and in CI, Vercel's variable there).
function buildRevision(): string {
  const git = spawnSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf-8' });
  if (git.status === 0 && git.stdout) return git.stdout.trim();
  return vercelCommit ?? 'local';
}

const serwist = createSerwistRoute({
  swSrc: 'src/app/sw.ts',
  useNativeEsbuild: true,
  // The app shell: Next's static files, the Fluent icons and the empty-state art. Shop photos are
  // cached when seen (sw.ts), never all 12 MB up front.
  globPatterns: [
    '.next/static/**/*.{js,css,woff2}',
    'public/icons/**/*.{svg,png,webp}',
    'public/art/**/*.webp',
  ],
  additionalPrecacheEntries: [{ url: '/~offline', revision: buildRevision() }],
});

interface SerwistContext {
  params: Promise<{ path: string }>;
}

// Cache Components has no `dynamic` or `revalidate` segment config, and esbuild's async work would make
// the route dynamic: the built file is cached, so sw.js and its map are prerendered at build.
async function builtFile(path: string): Promise<{ body: string; type: string } | null> {
  'use cache';
  const response = await serwist.GET(new Request(`https://local/serwist/${path}`), {
    params: Promise.resolve({ path }),
  });
  const body = await response.text();
  if (!body) return null;
  return { body, type: response.headers.get('Content-Type') ?? 'application/javascript' };
}

export const { generateStaticParams } = serwist;

export async function GET(_request: Request, { params }: SerwistContext) {
  const { path } = await params;
  const file = await builtFile(path);
  if (!file) return new Response(null, { status: 404 });
  return new Response(file.body, {
    headers: { 'Content-Type': file.type, 'Service-Worker-Allowed': '/' },
  });
}
