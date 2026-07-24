import { MEASUREMENT_ID, app } from './firebase'

// Only values worth reading in a report. Never send a person's name: the rosters are
// public, but a analytics property is not the place for them.
export type EventParams = Record<string, string | number | boolean>

type Logger = (name: string, params?: EventParams) => void

let logger: Logger | null = null
let loading: Promise<void> | null = null

// Loaded on demand so the analytics SDK stays out of the initial bundle.
async function load() {
  const { getAnalytics, isSupported, logEvent, setAnalyticsCollectionEnabled } = await import('firebase/analytics')
  if (!(await isSupported())) return

  const analytics = getAnalytics(app)
  setAnalyticsCollectionEnabled(analytics, true)
  logger = (name, params) => logEvent(analytics, name, params)
}

// Analytics must never take the site down, and a blocked or unsupported SDK is a
// normal outcome rather than a fault, so a failure here is swallowed on purpose.
export function initAnalytics() {
  if (!MEASUREMENT_ID) return Promise.resolve()
  loading ??= load().catch(() => undefined)
  return loading
}

export async function track(name: string, params?: EventParams) {
  if (!MEASUREMENT_ID) return
  await initAnalytics()
  logger?.(name, params)
}

export const isAnalyticsConfigured = () => Boolean(MEASUREMENT_ID)
