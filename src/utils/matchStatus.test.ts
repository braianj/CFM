import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import type { Match } from '../types/tournament'
import { getAutomaticMatchStatus } from './matchStatus'

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

  describe('when the match is inside its duration window', () => {
    it('should mark the match as live', () => {
      expect(getAutomaticMatchStatus(match, new Date('2026-07-24T10:45:00-03:00'))).toBe('live')
    })
  })

  describe('when the match duration has elapsed', () => {
    it('should mark the match as finished even without a score', () => {
      expect(getAutomaticMatchStatus(match, new Date('2026-07-24T11:31:00-03:00'))).toBe('finished')
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
