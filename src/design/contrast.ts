// Reads a custom property from the live document, following one level of `var()`
// so the interaction roles resolve to the palette colour they alias.
export function readToken(token: string): string {
  const style = getComputedStyle(document.documentElement)
  const raw = style.getPropertyValue(`--${token}`).trim()
  const alias = raw.match(/^var\(--([a-z-]+)\)$/)
  return alias ? readToken(alias[1]) : raw
}

export function luminance(hex: string): number {
  const value = hex.replace('#', '')
  const full = value.length === 3 ? [...value].map((channel) => channel + channel).join('') : value
  const channels = [0, 2, 4]
    .map((index) => parseInt(full.slice(index, index + 2), 16) / 255)
    .map((channel) => (channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4))
  return 0.2126 * channels[0] + 0.7152 * channels[1] + 0.0722 * channels[2]
}

// Returns null when a colour cannot be read, which happens if the stylesheet has
// not loaded. Callers render a dash instead of NaN.
export function contrast(foreground: string, background: string): number | null {
  if (!/^#[0-9a-f]{3,8}$/i.test(foreground) || !/^#[0-9a-f]{3,8}$/i.test(background)) return null
  const [light, dark] = [luminance(foreground), luminance(background)].sort((a, b) => b - a)
  return (light + 0.05) / (dark + 0.05)
}
