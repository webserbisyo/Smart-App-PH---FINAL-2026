import { resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

import { checkBrandRepo, checkBrandText, formatBrandViolations } from './brand-guard.js';

const repoRoot = resolve(import.meta.dirname, '..');

function rulesFor(path: string, text: string): string[] {
  return checkBrandText(path, text).map((violation) => violation.rule);
}

describe('brand guard rules', () => {
  it('flags raw Tailwind palette colours, including dark: and opacity forms', () => {
    expect(rulesFor('apps/dashboard/src/x.tsx', '<div className="bg-yellow-950" />')).toHaveLength(
      1,
    );
    expect(
      rulesFor(
        'apps/dashboard/src/x.tsx',
        '<div className="dark:text-blue-50 hover:bg-red-500/40" />',
      ),
    ).toHaveLength(1);
    expect(rulesFor('packages/ui/src/x.tsx', "cva('border-l-zinc-200')")).toHaveLength(1);
  });

  it('flags raw black and white utilities', () => {
    expect(rulesFor('apps/storefront/src/x.tsx', '<p className="text-white" />')).toHaveLength(1);
  });

  it('flags hard-coded hex, rgb and oklch colours in code and CSS', () => {
    expect(rulesFor('apps/dashboard/src/x.tsx', "const c = '#F4F4F5';")).toHaveLength(1);
    expect(rulesFor('apps/dashboard/src/x.tsx', '<div className="bg-[#2866ee]" />')).toHaveLength(
      1,
    );
    expect(rulesFor('apps/storefront/src/x.css', '.a { color: rgb(0 0 0); }')).toHaveLength(1);
    expect(rulesFor('apps/storefront/src/x.css', '.a { color: oklch(0.5 0.1 260); }')).toHaveLength(
      1,
    );
  });

  it('flags inline style colours unless they use a CSS variable', () => {
    expect(rulesFor('apps/dashboard/src/x.tsx', "style={{ background: 'white' }}")).toHaveLength(1);
    expect(rulesFor('apps/dashboard/src/x.tsx', "style={{ color: 'var(--foreground)' }}")).toEqual(
      [],
    );
    expect(
      rulesFor('apps/dashboard/src/x.tsx', "style={{ borderRadius: 'var(--logo-radius)' }}"),
    ).toEqual([]);
  });

  it('flags OKLCH color-mix with transparent (the brown glass bug)', () => {
    expect(
      rulesFor(
        'packages/ui/src/x.css',
        'background: color-mix(in oklch, var(--background) 84%, transparent);',
      ),
    ).toHaveLength(1);
    expect(
      rulesFor(
        'packages/ui/src/x.css',
        'background: color-mix(in srgb, var(--background) 84%, transparent);',
      ),
    ).toEqual([]);
  });

  it('allows token classes, anchors and the ignore comment', () => {
    expect(
      rulesFor(
        'apps/dashboard/src/x.tsx',
        '<div className="bg-warning-soft text-warning-text border-border" />',
      ),
    ).toEqual([]);
    expect(rulesFor('apps/dashboard/src/x.tsx', '<a href="#main">Skip</a>')).toEqual([]);
    expect(
      rulesFor('apps/dashboard/src/x.tsx', "const c = '#000000'; // brand-guard-ignore: QR code"),
    ).toEqual([]);
  });
});

describe('brand guard on the repository', () => {
  it('finds no raw colours in apps/dashboard, apps/storefront or packages/ui', () => {
    const violations = checkBrandRepo(repoRoot);
    expect(violations, `\n${formatBrandViolations(violations)}\n`).toEqual([]);
  });
});
