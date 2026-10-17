import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { basename, resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

describe('Components Registry', () => {
  const componentsDir = resolve(__dirname, '../src/components')
  const docsPath = resolve(__dirname, '../../../docs/components.md')

  it('fails if any file in src/components/ is not listed in the Installed table of docs/components.md', () => {
    if (!existsSync(componentsDir)) {
      expect(true).toBe(true)
      return
    }

    const files = readdirSync(componentsDir, { recursive: true, withFileTypes: true })
      .filter((entry) => entry.isFile() && (entry.name.endsWith('.tsx') || entry.name.endsWith('.ts')))
      .map((entry) => entry.name)

    if (files.length === 0) {
      expect(true).toBe(true)
      return
    }

    const docContent = readFileSync(docsPath, 'utf-8')
    const installedSection = docContent.split('## Installed')[1] ?? ''
    const installedTable = installedSection.split('## ')[0] ?? ''

    for (const file of files) {
      const componentName = basename(file).replace(/\.tsx?$/, '')
      const isListed =
        installedTable.includes(file) ||
        installedTable.toLowerCase().includes(componentName.toLowerCase())
      expect(
        isListed,
        `Component file "${file}" is in packages/ui/src/components/ but not documented in the Installed table of docs/components.md`,
      ).toBe(true)
    }
  })
})
