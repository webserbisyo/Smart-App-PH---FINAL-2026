import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

// Confirm dialogs are 384 px wide on a laptop and the phone's width less the margins on a phone. Three
// buttons in one row overflow that (T93, found on Storage's "Delete N proofs?"), so a footer holds two
// (Cancel and the one action), or stacks its buttons. A side step such as "Save a copy first" goes in the body.
const BUTTON = /<(Button|AsyncButton|AlertDialogCancel|AlertDialogAction)[\s>]/g;

function sources(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) return sources(path);
    return path.endsWith('.tsx') ? [path] : [];
  });
}

describe('confirm dialog footers', () => {
  const root = join(import.meta.dirname, '..', 'src');
  const footers = sources(root).flatMap((file) =>
    [
      ...readFileSync(file, 'utf8').matchAll(/<AlertDialogFooter[\s\S]*?<\/AlertDialogFooter>/g),
    ].map((m) => ({
      file: file.slice(root.length + 1),
      buttons: (m[0].match(BUTTON) ?? []).length,
      stacked: /<AlertDialogFooter[^>]*sm:flex-col/.test(m[0]),
    })),
  );

  it('finds the footers', () => {
    expect(footers.length).toBeGreaterThan(10);
  });

  it('holds at most two buttons in a row', () => {
    expect(footers.filter((f) => f.buttons > 2 && !f.stacked)).toEqual([]);
  });
});
