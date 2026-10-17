import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

// OKLCH to sRGB conversion for WCAG contrast ratio calculation
function oklchToRgb(l: number, c: number, h: number): [number, number, number] {
  const hRad = (h * Math.PI) / 180
  const a = c * Math.cos(hRad)
  const b = c * Math.sin(hRad)

  const l_ = l + 0.3963377774 * a + 0.2158037573 * b
  const m_ = l - 0.1055613458 * a - 0.0638541728 * b
  const s_ = l - 0.0894841775 * a - 1.291485548 * b

  const l3 = l_ * l_ * l_
  const m3 = m_ * m_ * m_
  const s3 = s_ * s_ * s_

  const rLinear = +4.0767434078 * l3 - 3.3077115913 * m3 + 0.2309699292 * s3
  const gLinear = -1.2684380046 * l3 + 2.6097574011 * m3 - 0.3413193965 * s3
  const bLinear = -0.0041960863 * l3 - 0.7034186147 * m3 + 1.707614701 * s3

  const toGamma = (val: number) => {
    const clamped = Math.max(0, Math.min(1, val))
    return clamped <= 0.0031308 ? 12.92 * clamped : 1.055 * Math.pow(clamped, 1 / 2.4) - 0.055
  }

  return [toGamma(rLinear), toGamma(gLinear), toGamma(bLinear)]
}

function srgbToLuminance(r: number, g: number, b: number): number {
  const toLinear = (c: number) => (c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4))
  return 0.2126 * toLinear(r) + 0.7152 * toLinear(g) + 0.0722 * toLinear(b)
}

function contrastRatio(l1: number, l2: number): number {
  const lighter = Math.max(l1, l2)
  const darker = Math.min(l1, l2)
  return (lighter + 0.05) / (darker + 0.05)
}

function parseOklch(str: string): [number, number, number] {
  const match = str.match(/oklch\(\s*([\d.]+)\s+([\d.]+)\s+([\d.]+)/)
  if (!match || !match[1] || !match[2] || !match[3]) {
    throw new Error(`Failed to parse oklch string: ${str}`)
  }
  return [parseFloat(match[1]), parseFloat(match[2]), parseFloat(match[3])]
}

describe('Design Tokens Contrast', () => {
  const cssPath = resolve(__dirname, '../src/styles/tokens.css')
  const css = readFileSync(cssPath, 'utf-8')

  function extractToken(block: string, token: string): string {
    const regex = new RegExp(`--color-${token}:\\s*([^;]+);`)
    const match = block.match(regex)
    if (!match || !match[1]) {
      throw new Error(`Token --color-${token} not found`)
    }
    return match[1].trim()
  }

  const [themePart, darkPart] = css.split('.dark')
  if (!themePart || !darkPart) {
    throw new Error('Could not split tokens.css into light and dark blocks')
  }

  const textPairs = [
    ['primary', 'primary-foreground'],
    ['secondary', 'secondary-foreground'],
    ['destructive', 'destructive-foreground'],
    ['success', 'success-foreground'],
    ['warning', 'warning-foreground'],
    ['info', 'info-foreground'],
    ['member', 'member-foreground'],
    ['highlight', 'highlight-foreground'],
    ['background', 'foreground'],
    ['card', 'card-foreground'],
    ['popover', 'popover-foreground'],
    ['success-soft', 'success-soft-foreground'],
    ['warning-soft', 'warning-soft-foreground'],
    ['info-soft', 'info-soft-foreground'],
    ['member-soft', 'member-soft-foreground'],
  ]

  describe('Light Mode Text Contrast (>= 4.5:1)', () => {
    for (const [bg, fg] of textPairs) {
      it(`${bg} vs ${fg}`, () => {
        const bgOklch = parseOklch(extractToken(themePart, bg))
        const fgOklch = parseOklch(extractToken(themePart, fg))
        const bgRgb = oklchToRgb(...bgOklch)
        const fgRgb = oklchToRgb(...fgOklch)
        const ratio = contrastRatio(srgbToLuminance(...bgRgb), srgbToLuminance(...fgRgb))
        expect(ratio).toBeGreaterThanOrEqual(4.5)
      })
    }
  })

  describe('Dark Mode Text Contrast (>= 4.5:1)', () => {
    for (const [bg, fg] of textPairs) {
      it(`${bg} vs ${fg}`, () => {
        const bgOklch = parseOklch(extractToken(darkPart, bg))
        const fgOklch = parseOklch(extractToken(darkPart, fg))
        const bgRgb = oklchToRgb(...bgOklch)
        const fgRgb = oklchToRgb(...fgOklch)
        const ratio = contrastRatio(srgbToLuminance(...bgRgb), srgbToLuminance(...fgRgb))
        expect(ratio).toBeGreaterThanOrEqual(4.5)
      })
    }
  })
})
