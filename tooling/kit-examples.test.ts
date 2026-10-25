import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

// Decision D1 (T02b): the ReUI c-* examples live only in the dashboard /kit.
const __filename = fileURLToPath(import.meta.url);
const projectRoot = path.resolve(path.dirname(__filename), '..');
const KIT_DIR = path.join(projectRoot, 'apps/dashboard/src/features/kit');
const SOURCE = /\.(ts|tsx|js|jsx|mts)$/;
const SKIP = new Set(['node_modules', 'dist', '.next', '.turbo', 'coverage']);

function sourceFiles(dir: string): string[] {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    if (SKIP.has(entry.name)) return [];
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) return sourceFiles(full);
    return SOURCE.test(entry.name) ? [full] : [];
  });
}

function importsOf(file: string): string[] {
  const text = fs.readFileSync(file, 'utf8');
  return [...text.matchAll(/(?:from|import)\s*\(?\s*['"]([^'"]+)['"]/g)].flatMap((m) =>
    m[1] ? [m[1]] : [],
  );
}

const rel = (file: string) => path.relative(projectRoot, file);

describe('Kit examples stay on /kit', () => {
  it('only files inside features/kit import features/kit/examples', () => {
    const offenders = sourceFiles(path.join(projectRoot, 'apps/dashboard/src'))
      .filter((file) => !file.startsWith(KIT_DIR + path.sep))
      .filter((file) => importsOf(file).some((spec) => spec.includes('kit/examples')))
      .map(rel);
    expect(offenders).toEqual([]);
  });

  it('nothing in apps/storefront or packages imports a c-* example', () => {
    const files = [
      ...sourceFiles(path.join(projectRoot, 'apps/storefront')),
      ...sourceFiles(path.join(projectRoot, 'packages')),
    ];
    const offenders = files
      .filter((file) =>
        importsOf(file).some(
          (spec) => /(^|\/)c-[a-z-]+-\d+$/.test(spec) || spec.includes('examples/'),
        ),
      )
      .map(rel);
    expect(offenders).toEqual([]);
  });

  it('finds the 119 examples it guards', () => {
    const examples = fs
      .readdirSync(path.join(KIT_DIR, 'examples'))
      .filter((name) => /^c-.+\.tsx$/.test(name));
    expect(examples).toHaveLength(119);
  });
});
