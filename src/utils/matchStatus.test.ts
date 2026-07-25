import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import type { Match } from '../types/tournament'
import { MATCH_DURATION_MINUTES, OVERTIME_MINUTES, PERIOD_MINUTES, REGULATION_PERIODS, getAutomaticMatchStatus } from './matchStatus'

describe('match duration', () => {
  it('should be two stopped-clock periods of fifteen minutes', () => {
    expect(REGULATION_PERIODS).toBe(2)
    expect(PERIOD_MINUTES).toBe(15)
    expect(OVERTIME_MINUTES).toBe(5)
  })

  it('should keep the live window longer than the played minutes', () => {
    // A stopped clock means wall-clock time exceeds the 30 played minutes.
    expect(MATCH_DURATION_MINUTES).toBeGreaterThan(REGULATION_PERIODS * PERIOD_MINUTES)
  })
})

describe('getAutomaticMatchStatus', () => {
  let match: Match

  beforeEach(() => {
    match = {
      id: 'match',
      category: 'men',
      startDateTime: '2026-07-24T10:00:00-03:00',
      stage: 'regular',
      homeTeamId: 'home',
      awayTeamId: 'away',
      homeScore: null,
      awayScore: null,
      status: 'upcoming',
      countsForStandings: true,
    }
  })

  afterEach(() => {
    match = undefined as unknown as Match
  })

  describe('when the start time has not arrived', () => {
    it('should mark the match as upcoming', () => {
      expect(getAutomaticMatchStatus(match, new Date('2026-07-24T09:59:00-03:00'))).toBe('upcoming')
    })
  })

  describe('when the match is under way', () => {
    it('should mark the match as live', () => {
      expect(getAutomaticMatchStatus(match, new Date('2026-07-24T10:39:00-03:00'))).toBe('live')
    })
  })

  describe('when the live window has elapsed', () => {
    it('should mark the match as finished even without a score', () => {
      expect(getAutomaticMatchStatus(match, new Date('2026-07-24T10:41:00-03:00'))).toBe('finished')
    })
  })

  describe('when playoff participants are unknown', () => {
    beforeEach(() => {
      match.homeTeamId = undefined
      match.homeLabel = 'Ganador semifinal'
    })

    it('should keep the match to be confirmed', () => {
      expect(getAutomaticMatchStatus(match, new Date('2026-07-25T12:00:00-03:00'))).toBe('tbd')
    })
  })
})
