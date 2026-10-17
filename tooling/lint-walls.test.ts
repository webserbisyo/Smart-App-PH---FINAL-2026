import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { ESLint } from 'eslint'
import { describe, expect, it } from 'vitest'

const rootDir = resolve(__dirname, '..')

function readFixture(name: string): string {
  return readFileSync(resolve(__dirname, 'fixtures', name), 'utf-8')
}

describe('ESLint walls', () => {
  const eslint = new ESLint({ cwd: rootDir })

  async function lintCode(code: string, filePath: string) {
    const results = await eslint.lintText(code, { filePath: resolve(rootDir, filePath) })
    return results[0]?.messages ?? []
  }

  it('prohibits apps from cross-importing', async () => {
    const messages = await lintCode(readFixture('apps-cross-import.ts'), 'apps/dashboard/src/index.ts')
    expect(messages.some((m) => m.ruleId === 'no-restricted-imports')).toBe(true)
  })

  it('prohibits apps/dashboard from importing @supabase/*', async () => {
    const messages = await lintCode(readFixture('supabase-unauthorized.ts'), 'apps/dashboard/src/client.ts')
    expect(messages.some((m) => m.ruleId === 'no-restricted-imports')).toBe(true)
  })

  it('prohibits packages/core from importing React', async () => {
    const messages = await lintCode(readFixture('core-imports-react.ts'), 'packages/core/src/schemas/auth.ts')
    expect(messages.some((m) => m.ruleId === 'no-restricted-imports')).toBe(true)
  })

  it('prohibits packages/core from importing @supabase/*', async () => {
    const messages = await lintCode(readFixture('core-imports-supabase.ts'), 'packages/core/src/index.ts')
    expect(messages.some((m) => m.ruleId === 'no-restricted-imports')).toBe(true)
  })

  it('prohibits packages/core from importing @smartapp/ui', async () => {
    const messages = await lintCode(readFixture('core-imports-ui.ts'), 'packages/core/src/index.ts')
    expect(messages.some((m) => m.ruleId === 'no-restricted-imports')).toBe(true)
  })

  it('prohibits packages/core from importing @smartapp/data', async () => {
    const messages = await lintCode(readFixture('core-imports-data.ts'), 'packages/core/src/index.ts')
    expect(messages.some((m) => m.ruleId === 'no-restricted-imports')).toBe(true)
  })

  it('prohibits packages/ui from importing @smartapp/data', async () => {
    const messages = await lintCode(readFixture('ui-imports-data.ts'), 'packages/ui/src/components/card.tsx')
    expect(messages.some((m) => m.ruleId === 'no-restricted-imports')).toBe(true)
  })

  it('prohibits dashboard features from cross-importing', async () => {
    const messages = await lintCode(readFixture('dashboard-cross-feature.ts'), 'apps/dashboard/src/features/products/index.ts')
    expect(messages.some((m) => m.ruleId === 'no-restricted-imports')).toBe(true)
  })

  it('catches JSX inline styles without cssVars(...)', async () => {
    const messages = await lintCode(readFixture('css-inline-style.tsx'), 'apps/dashboard/src/components/item.tsx')
    expect(messages.some((m) => m.ruleId === 'no-restricted-syntax')).toBe(true)
  })

  it('catches arbitrary CSS values like p-[13px]', async () => {
    const messages = await lintCode(readFixture('css-arbitrary-class.tsx'), 'apps/dashboard/src/components/item.tsx')
    expect(messages.some((m) => m.ruleId === 'no-restricted-syntax')).toBe(true)
  })

  it('catches hex colors in CSS classes', async () => {
    const messages = await lintCode(readFixture('css-hex-color.tsx'), 'apps/dashboard/src/components/item.tsx')
    expect(messages.some((m) => m.ruleId === 'no-restricted-syntax')).toBe(true)
  })

  it('permits cssVars(...) call in JSX style attribute', async () => {
    const messages = await lintCode(readFixture('css-valid-style.tsx'), 'apps/dashboard/src/components/item.tsx')
    expect(messages.filter((m) => m.ruleId === 'no-restricted-syntax')).toHaveLength(0)
  })

  it('prohibits type assertions (as casts)', async () => {
    const messages = await lintCode(readFixture('type-assertion.ts'), 'packages/core/src/test.ts')
    expect(messages.some((m) => m.ruleId === '@typescript-eslint/consistent-type-assertions')).toBe(true)
  })

  it('prohibits ts-ignore and ts-expect-error comments', async () => {
    const messages = await lintCode(readFixture('ts-comment.ts'), 'packages/core/src/test.ts')
    expect(messages.some((m) => m.ruleId === '@typescript-eslint/ban-ts-comment')).toBe(true)
  })
})
