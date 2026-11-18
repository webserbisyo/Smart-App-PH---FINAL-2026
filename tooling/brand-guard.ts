/**
 * Brand guard (decision T99, adapted from the Stays repo): screens and our own components take every
 * colour from the theme tokens in `packages/ui/src/styles/tokens.css`, never from raw Tailwind palette
 * colours or hard-coded colour values. Raw colours ignore light/dark mode and each shop's palette.
 *
 * Run by `tooling/brand-guard.test.ts` inside `pnpm check`, so a violation turns CI red.
 * A line that genuinely needs a literal colour (a QR code, a phone's theme-color, an owner's default
 * colour) ends with the comment `brand-guard-ignore` plus a reason.
 */
import { readdirSync, readFileSync } from 'node:fs';
import { join, relative, sep } from 'node:path';

export interface BrandViolation {
  readonly file: string;
  readonly line: number;
  readonly rule: string;
  readonly text: string;
}

/** Folders whose source files are checked. */
export const BRAND_GUARD_ROOTS = ['apps/dashboard/src', 'apps/storefront/src', 'packages/ui/src'];

/**
 * Files allowed to contain literal colours, each with its reason.
 * - `packages/ui/src/styles/`: the token definitions themselves.
 * - `packages/ui/src/components/`: installed library files stay as shipped (AGENTS rule 1). Some ship
 *   raw colours (status, stat, banner, number-ticker, grid-pattern, animated-shiny-text, the data grid's
 *   row states); our code dresses them with token classes instead (see docs/components.md).
 * - the kit: its token tables print colour values on purpose so the founder can check them.
 */
const ALLOWED_PATH_PARTS = [
  'packages/ui/src/styles/',
  'packages/ui/src/components/',
  'apps/dashboard/src/features/kit/',
];

const STYLES_PATH = 'packages/ui/src/styles/';
const OKLCH_MIX_RULE =
  'color-mix in OKLCH with transparent tints the colour (mix in srgb or oklab)';

const SOURCE_EXTENSIONS = ['.ts', '.tsx', '.css'];
const SKIPPED_DIRS = new Set(['node_modules', 'dist', '.next', '.turbo', 'test-results']);

const PALETTE =
  'slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose';
const UTILITY =
  'bg|text|border|border-[trblxy]|ring|ring-offset|outline|fill|stroke|from|via|to|divide|placeholder|caret|accent|decoration|shadow';

const RULES: readonly { readonly name: string; readonly pattern: RegExp; readonly css: boolean }[] =
  [
    {
      name: 'raw Tailwind palette colour (use a token such as bg-warning-soft or text-muted-foreground)',
      pattern: new RegExp(`(?<![\\w-])(?:${UTILITY})-(?:${PALETTE})-\\d{2,3}(?:\\/\\d+)?\\b`),
      css: false,
    },
    {
      // A translucent black scrim behind sheets and drawers (bg-black/10) is allowed: it dims
      // whatever is underneath in both themes, which is its whole job.
      name: 'raw Tailwind black/white (use bg-background, text-foreground or a token)',
      pattern:
        /(?<![\w-])(?:(?:text|border|ring|fill|stroke)-(?:black|white)(?:\/\d+)?|bg-(?:black|white)(?!\/\d))\b/,
      css: false,
    },
    {
      name: 'hard-coded hex colour (use var(--token) or a token class)',
      pattern: /(?<![\w&/])#(?:[0-9a-fA-F]{8}|[0-9a-fA-F]{6}|[0-9a-fA-F]{3,4})\b(?![\w-])/,
      css: true,
    },
    {
      name: 'hard-coded rgb/hsl/oklch colour (use var(--token))',
      pattern: /\b(?:rgba?|hsla?|oklch|oklab|lab|lch)\(\s*[\d.]/,
      css: true,
    },
    {
      name: 'inline style colour that is not a CSS variable (use a token class or var(--token))',
      pattern:
        /\b(?:color|background|backgroundColor|borderColor|fill|stroke|outlineColor)\s*:\s*(?!['"`]?var\()['"`]/,
      css: false,
    },
    {
      name: OKLCH_MIX_RULE,
      pattern: /color-mix\(\s*in\s+oklch[^;]*transparent/,
      css: true,
    },
  ];

function isAllowedPath(relativePath: string): boolean {
  return ALLOWED_PATH_PARTS.some((part) => relativePath.includes(part));
}

function isCheckedFile(name: string): boolean {
  if (/\.(test|spec|e2e)\.tsx?$/.test(name)) return false;
  return SOURCE_EXTENSIONS.some((extension) => name.endsWith(extension));
}

function listFiles(directory: string): string[] {
  const files: string[] = [];
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    if (entry.isDirectory()) {
      if (!SKIPPED_DIRS.has(entry.name)) files.push(...listFiles(join(directory, entry.name)));
    } else if (isCheckedFile(entry.name)) {
      files.push(join(directory, entry.name));
    }
  }
  return files;
}

/** Checks one file's text. Exported so the test can prove each rule fires. */
export function checkBrandText(relativePath: string, text: string): BrandViolation[] {
  const isCss = relativePath.endsWith('.css');
  const violations: BrandViolation[] = [];
  const lines = text.split('\n');
  lines.forEach((lineText, index) => {
    if (lineText.includes('brand-guard-ignore')) return;
    const trimmed = lineText.trim();
    if (trimmed.startsWith('//') || trimmed.startsWith('*') || trimmed.startsWith('/*')) return;
    for (const rule of RULES) {
      if (isCss && !rule.css) continue;
      if (rule.pattern.test(lineText)) {
        violations.push({
          file: relativePath,
          line: index + 1,
          rule: rule.name,
          text: trimmed.slice(0, 160),
        });
      }
    }
  });
  return violations;
}

/** Checks every source file under BRAND_GUARD_ROOTS. */
export function checkBrandRepo(repoRoot: string): BrandViolation[] {
  const violations: BrandViolation[] = [];
  for (const root of BRAND_GUARD_ROOTS) {
    for (const file of listFiles(join(repoRoot, root))) {
      const relativePath = relative(repoRoot, file).split(sep).join('/');
      const text = readFileSync(file, 'utf8');
      if (isAllowedPath(relativePath)) {
        // Token files may hold literal colours, but a transparent mix must still be sRGB or OKLab.
        if (relativePath.includes(STYLES_PATH)) {
          violations.push(
            ...checkBrandText(relativePath, text).filter((v) => v.rule === OKLCH_MIX_RULE),
          );
        }
        continue;
      }
      violations.push(...checkBrandText(relativePath, text));
    }
  }
  return violations;
}

export function formatBrandViolations(violations: readonly BrandViolation[]): string {
  return violations
    .map(
      (violation) => `${violation.file}:${violation.line} ${violation.rule}\n    ${violation.text}`,
    )
    .join('\n');
}
