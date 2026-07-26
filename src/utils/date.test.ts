import { describe, expect, it } from 'vitest'
import { buildStartDateTime, splitStartDateTime } from './date'

describe('splitStartDateTime', () => {
  describe('when the kick-off was written with the Ushuaia offset', () => {
    it('should read the date and time exactly as written', () => {
      expect(splitStartDateTime('2026-07-26T12:00:00-03:00')).toEqual({ date: '2026-07-26', time: '12:00' })
    })

    it('should not shift a late kick-off to the next day', () => {
      expect(splitStartDateTime('2026-07-25T22:50:00-03:00')).toEqual({ date: '2026-07-25', time: '22:50' })
    })
  })

  describe('when the kick-off arrives in another form', () => {
    it('should still report the time the rink will see', () => {
      expect(splitStartDateTime('2026-07-26T15:00:00Z')).toEqual({ date: '2026-07-26', time: '12:00' })
    })
  })
})

describe('buildStartDateTime', () => {
  it('should keep the tournament on Ushuaia time', () => {
    expect(buildStartDateTime('2026-07-26', '13:00')).toBe('2026-07-26T13:00:00-03:00')
  })

  it('should round-trip whatever the panel shows', () => {
    const original = '2026-08-01T21:45:00-03:00'
    const { date, time } = splitStartDateTime(original)

    expect(buildStartDateTime(date, time)).toBe(original)
  })
})
