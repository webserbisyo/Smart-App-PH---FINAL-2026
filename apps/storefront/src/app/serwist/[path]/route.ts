import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { cacheLife } from 'next/cache';
import { createSerwistRoute } from '@serwist/turbopack';
import { vercelCommit } from '@/env';

// The offline page's precache revision: this commit (git locally and in CI, Vercel's variable there).
function buildRevision(): string {
  const git = spawnSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf-8' });
  if (git.status === 0 && git.stdout) return git.stdout.trim();
  return vercelCommit ?? 'local';
}

// The files the offline page itself needs (its scripts and stylesheet), read from the build's own manifests,
// which exist before any page is prerendered. Null in `next dev` or if Next moves them: then every file
// under .next/static is kept, as before.
function offlinePageFiles(): Set<string> | null {
  const dir = join(process.cwd(), '.next', 'server', 'app', '~offline');
  try {
    const text = ['page/build-manifest.json', 'page_client-reference-manifest.js']
      .map((file) => readFileSync(join(dir, file), 'utf-8'))
      .join('\n');
    const files = new Set(text.match(/static\/[\w./-]+\.(?:js|css)/g) ?? []);
    return files.size > 0 ? files : null;
  } catch {
    return null;
  }
}

const serwist = createSerwistRoute({
  swSrc: 'src/app/sw.ts',
  useNativeEsbuild: true,
  // Saved up front: only what the offline page needs, so a customer's first visit doesn't download every
  // script, font and icon in the background (about 2.9 MB before, on prepaid data). Everything else is
  // saved as it is used (sw.ts: Next's files, shop photos, icons and art).
  globPatterns: ['.next/static/**/*.{js,css}', 'public/art/offline.webp'],
  manifestTransforms: [
    (entries) => {
      const keep = offlinePageFiles();
      if (!keep) return { manifest: entries, warnings: [] };
      const manifest = entries.filter(
        (entry) =>
          !entry.url.startsWith('.next/static/') || keep.has(entry.url.slice('.next/'.length)),
      );
      return { manifest, warnings: [] };
    },
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
  // Kept for the whole deploy: rebuilding it on Vercel fails (esbuild and Next's config aren't in the
  // function), which logged errors every time the default 15-minute copy went stale.
  cacheLife('max');
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
