// Fails when a storefront page's first JavaScript grows past its budget (decisions T31 and R49). Reads the
// built pages in apps/storefront/.next (run `pnpm build` first) and adds up the gzipped size of every
// script a page loads before anything else happens. Old-browser polyfills (noModule) are skipped: phones
// never download them. Run: pnpm --filter @smartapp/tooling budget
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { gzipSync } from 'node:zlib';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const NEXT_DIR = path.join(root, 'apps/storefront/.next');
const PAGES_DIR = path.join(NEXT_DIR, 'server/app');
const KB = 1024;

// Every page a customer can land on: 300 KB (T31). Checkout is only reached from the basket, whose code
// Next has already loaded in the background by then (R47), so it gets 20 KB more for its form parts.
const DEFAULT_BUDGET = 300 * KB;
const BUDGETS: Record<string, number> = { '/<shop>/checkout': 320 * KB };

const SCRIPT = /<script([^>]*)\ssrc="\/_next\/(static\/[^"]+\.js)"([^>]*)>/g;

function htmlFiles(dir: string): string[] {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) return htmlFiles(full);
    return entry.name.endsWith('.html') ? [full] : [];
  });
}

// "/kanto-smash/o/demo-preparing.html" -> "/<shop>/o/<token>", so each kind of page is one row.
function pageKind(file: string, shops: ReadonlySet<string>): string {
  const parts = path
    .relative(PAGES_DIR, file)
    .replace(/\.html$/, '')
    .split(path.sep);
  const [first, second, third] = parts;
  if (first === undefined) return '/';
  const shop = shops.has(first) || first === '[shop]' ? '<shop>' : first;
  if (second === 'o' && third !== undefined) return `/${shop}/o/<token>`;
  return `/${[shop, ...parts.slice(1)].join('/')}`;
}

const gzipped = new Map<string, number>();
function scriptSize(src: string): number {
  const known = gzipped.get(src);
  if (known !== undefined) return known;
  const size = gzipSync(fs.readFileSync(path.join(NEXT_DIR, src))).length;
  gzipped.set(src, size);
  return size;
}

if (!fs.existsSync(PAGES_DIR)) {
  console.error('No storefront build: run `pnpm build` first.');
  process.exit(1);
}

const files = htmlFiles(PAGES_DIR);
// A folder next to a page of the same name is a shop (kanto-smash.html and kanto-smash/).
const shops = new Set(
  fs
    .readdirSync(PAGES_DIR, { withFileTypes: true })
    .filter(
      (entry) => entry.isDirectory() && fs.existsSync(path.join(PAGES_DIR, `${entry.name}.html`)),
    )
    .map((entry) => entry.name),
);

const largest = new Map<string, number>();
for (const file of files) {
  const html = fs.readFileSync(file, 'utf8');
  const scripts = new Set(
    [...html.matchAll(SCRIPT)]
      .filter((match) => !/nomodule/i.test(`${match[1] ?? ''}${match[3] ?? ''}`))
      .flatMap((match) => (match[2] === undefined ? [] : [match[2]])),
  );
  const total = [...scripts].reduce((sum, src) => sum + scriptSize(src), 0);
  const kind = pageKind(file, shops);
  largest.set(kind, Math.max(largest.get(kind) ?? 0, total));
}

let over = 0;
for (const [kind, size] of [...largest.entries()].sort((a, b) => b[1] - a[1])) {
  const budget = BUDGETS[kind] ?? DEFAULT_BUDGET;
  const ok = size <= budget;
  if (!ok) over += 1;
  console.log(
    `${ok ? 'ok  ' : 'OVER'} ${(size / KB).toFixed(1).padStart(6)} KB of ${budget / KB} KB  ${kind}`,
  );
}

if (over > 0) {
  console.error(
    `\n${over} page kind(s) over budget. Load parts that are not needed for the first paint later (next/dynamic or React.lazy).`,
  );
  process.exit(1);
}
