import { afterEach, describe, expect, it, vi } from 'vitest'

const loadModule = async (measurementId: string) => {
  vi.resetModules()
  vi.doMock('./firebase', () => ({ MEASUREMENT_ID: measurementId, app: {} }))
  return import('./analytics')
}

afterEach(() => vi.doUnmock('./firebase'))

describe('analytics', () => {
  describe('when Google Analytics is not configured', () => {
    it('should report itself as unconfigured', async () => {
      const { isAnalyticsConfigured } = await loadModule('')

      expect(isAnalyticsConfigured()).toBe(false)
    })

    it('should never load the SDK', async () => {
      const analyticsModule = vi.fn()
      vi.doMock('firebase/analytics', analyticsModule)
      const { track } = await loadModule('')

      await track('select_view', { view: 'matches' })

      expect(analyticsModule).not.toHaveBeenCalled()
      vi.doUnmock('firebase/analytics')
    })
  })

  describe('when the SDK fails to load', () => {
    it('should swallow the failure instead of breaking the page', async () => {
      vi.doMock('firebase/analytics', () => {
        throw new Error('blocked by the browser')
      })
      const { track } = await loadModule('G-TEST123456')

      await expect(track('select_view', { view: 'matches' })).resolves.toBeUndefined()

      vi.doUnmock('firebase/analytics')
    })
  })

  describe('when the SDK is available', () => {
    it('should forward the event and its parameters', async () => {
      const logEvent = vi.fn()
      vi.doMock('firebase/analytics', () => ({
        getAnalytics: () => ({ instance: true }),
        isSupported: () => Promise.resolve(true),
        setAnalyticsCollectionEnabled: vi.fn(),
        logEvent,
      }))
      const { track } = await loadModule('G-TEST123456')

      await track('select_team', { team_id: 'men-cau-1' })

      expect(logEvent).toHaveBeenCalledWith({ instance: true }, 'select_team', { team_id: 'men-cau-1' })
      vi.doUnmock('firebase/analytics')
    })

    it('should stay silent where the browser does not support it', async () => {
      const logEvent = vi.fn()
      vi.doMock('firebase/analytics', () => ({
        getAnalytics: () => ({ instance: true }),
        isSupported: () => Promise.resolve(false),
        setAnalyticsCollectionEnabled: vi.fn(),
        logEvent,
      }))
      const { track } = await loadModule('G-TEST123456')

      await track('select_team', { team_id: 'men-cau-1' })

      expect(logEvent).not.toHaveBeenCalled()
      vi.doUnmock('firebase/analytics')
    })
  })
})
