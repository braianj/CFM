import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

// Read from disk: vitest stubs CSS imports, so `?raw` would hand back an empty string.
const css = readFileSync(resolve(process.cwd(), 'src/styles/global.css'), 'utf8')

// Resolves one level of `var()` so the interaction roles reach their palette colour.
const token = (name: string): string => {
  const match = css.match(new RegExp(`--${name}:\\s*(#[0-9a-f]{3,6}|var\\(--[a-z-]+\\))`, 'i'))
  if (!match) throw new Error(`El token --${name} no existe en global.css`)
  const alias = match[1].match(/^var\(--([a-z-]+)\)$/)
  return alias ? token(alias[1]) : match[1]
}

const luminance = (hex: string) => {
  const value = hex.replace('#', '')
  const full = value.length === 3 ? [...value].map((c) => c + c).join('') : value
  const channels = [0, 2, 4]
    .map((index) => parseInt(full.slice(index, index + 2), 16) / 255)
    .map((channel) => (channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4))
  return 0.2126 * channels[0] + 0.7152 * channels[1] + 0.0722 * channels[2]
}

const contrast = (foreground: string, background: string) => {
  const [light, dark] = [luminance(foreground), luminance(background)].sort((a, b) => b - a)
  return (light + 0.05) / (dark + 0.05)
}

const WHITE = '#ffffff'

describe('palette contrast', () => {
  describe('when text sits on a surface', () => {
    it.each([
      ['ink on the page background', token('ink'), token('bg')],
      ['muted text on white', token('muted'), WHITE],
      ['muted text on the page background', token('muted'), token('bg')],
      ['muted text on the muted surface', token('muted'), token('surface-muted')],
      ['the accent used as link text', token('accent-dark'), WHITE],
      ['white on a primary button', WHITE, token('accent-dark')],
      ['white on the deep green header', WHITE, token('deep')],
      ['white on the accent badge', WHITE, token('accent')],
      ['accent text on the accent tint', token('accent-dark'), token('accent-soft')],
      ['ink on the primary qualification band', token('ink'), token('accent-faint')],
      ['ink on the secondary qualification band', token('ink'), token('gold-faint')],
      ['the live colour on white', token('live'), WHITE],
      ['the ink of a selected control', token('state-selected-ink'), token('state-selected')],
      ['a filtered field', token('state-selected-line'), token('state-selected-soft')],
      ['an idle option on the control track', token('state-idle-ink'), token('surface-muted')],
      ['a hovered option', token('accent-dark'), token('state-hover')],
    ])('should keep %s readable', (_label, foreground, background) => {
      expect(contrast(foreground, background)).toBeGreaterThanOrEqual(4.5)
    })
  })

  describe('when an element is only a visual boundary', () => {
    it.each([
      ['the focus ring on white', token('focus'), WHITE],
      ['the focus ring on the muted surface', token('focus'), token('surface-muted')],
      ['the strong border on white', token('border-strong'), WHITE],
      ['the strong border on the page background', token('border-strong'), token('bg')],
      ['a selected control against its track', token('state-selected'), token('surface-muted')],
    ])('should keep %s visible', (_label, foreground, background) => {
      expect(contrast(foreground, background)).toBeGreaterThanOrEqual(3)
    })
  })
})
