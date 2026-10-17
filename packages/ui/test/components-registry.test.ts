import { existsSync, readdirSync, readFileSync, type Dirent } from 'node:fs';
import { basename, resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

describe('Components Registry', () => {
  const currentDir = import.meta.dirname ?? __dirname;
  const componentsDir = resolve(currentDir, '../src/components');
  const docsPath = resolve(currentDir, '../../../docs/components.md');

  it('fails if any file in src/components/ is not listed in the Installed table of docs/components.md', () => {
    if (!existsSync(componentsDir)) {
      expect(true).toBe(true);
      return;
    }

    const entries = readdirSync(componentsDir, { recursive: true, withFileTypes: true });
    const files = entries
      .filter(
        (entry: Dirent) =>
          entry.isFile() && (entry.name.endsWith('.tsx') || entry.name.endsWith('.ts')),
      )
      .map((entry: Dirent) => entry.name);

    if (files.length === 0) {
      expect(true).toBe(true);
      return;
    }

    const docContent = readFileSync(docsPath, 'utf-8');
    const installedSection = docContent.split('## Installed')[1] ?? '';
    const installedTable = installedSection.split('## ')[0] ?? '';

    for (const file of files) {
      const componentName = basename(file).replace(/\.tsx?$/, '');
      const isListed =
        installedTable.includes(file) ||
        installedTable.toLowerCase().includes(componentName.toLowerCase());
      expect(
        isListed,
        `Component file "${file}" is in packages/ui/src/components/ but not documented in the Installed table of docs/components.md`,
      ).toBe(true);
    }
  });
});
