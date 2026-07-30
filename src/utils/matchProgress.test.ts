import { describe, expect, it } from 'vitest'
import type { Match, MatchEvent, MatchRosterEntry } from '../types/tournament'
import { getMatchCode, getMatchProgress } from './matchProgress'

const match = (overrides: Partial<Match> = {}): Match => ({
  id: 'h-8',
  category: 'men',
  startDateTime: '2026-07-28T21:30:00-03:00',
  stage: 'regular',
  homeTeamId: 'men-cau-3',
  awayTeamId: 'men-ovejas-negras',
  homeScore: 4,
  awayScore: 1,
  status: 'finished',
  countsForStandings: true,
  ...overrides,
})

const callUp = (playerName: string): MatchRosterEntry => ({
  id: `h-8_${playerName}`,
  matchId: 'h-8',
  category: 'men',
  teamId: 'men-cau-3',
  playerId: playerName,
  playerName,
  jerseyNumber: 91,
})

const event = (overrides: Partial<MatchEvent> = {}): MatchEvent => ({
  id: 'h-8-01',
  matchId: 'h-8',
  category: 'men',
  teamId: 'men-cau-3',
  type: 'goal',
  playerName: 'Francisco Val',
  jerseyNumber: 91,
  period: 1,
  gameTime: '8:04',
  ...overrides,
})

describe('getMatchProgress', () => {
  describe('when everything is loaded and readable', () => {
    it('should report the match as done', () => {
      const progress = getMatchProgress(match(), [callUp('Francisco Val')], [event()])

      expect(progress).toMatchObject({ hasResult: true, calledUp: 1, events: 1, pending: 0, done: true })
    })
  })

  describe('when a nil-all draw was loaded', () => {
    it('should count zero as a result', () => {
      const progress = getMatchProgress(match({ homeScore: 0, awayScore: 0 }), [callUp('Ana')], [event()])

      expect(progress.hasResult).toBe(true)
    })
  })

  describe('when the result is still missing', () => {
    it('should not report the match as done', () => {
      const progress = getMatchProgress(match({ homeScore: null, awayScore: null }), [callUp('Ana')], [event()])

      expect(progress).toMatchObject({ hasResult: false, done: false })
    })
  })

  describe('when nobody was called up', () => {
    it('should not report the match as done', () => {
      expect(getMatchProgress(match(), [], [event()]).done).toBe(false)
    })
  })

  describe('when nothing was published', () => {
    it('should not report the match as done', () => {
      expect(getMatchProgress(match(), [callUp('Ana')], []).done).toBe(false)
    })
  })

  describe('when an event is still waiting on the scoresheet', () => {
    it('should count it as pending and hold the match open', () => {
      const progress = getMatchProgress(match(), [callUp('Ana')], [
        event(),
        event({ id: 'h-8-02', playerName: '', jerseyNumber: 97 }),
      ])

      expect(progress).toMatchObject({ events: 2, pending: 1, done: false })
    })

    it('should count a line whose only problem is a remark', () => {
      const progress = getMatchProgress(match(), [callUp('Ana')], [
        event({ notes: 'La planilla anota una asistencia ilegible.' }),
      ])

      expect(progress).toMatchObject({ pending: 1, done: false })
    })
  })

  describe('when other matches have their own data', () => {
    it('should not count them', () => {
      const progress = getMatchProgress(match(), [
        callUp('Ana'),
        { ...callUp('Otro'), matchId: 'h-9' },
      ], [event(), event({ id: 'h-9-01', matchId: 'h-9' })])

      expect(progress).toMatchObject({ calledUp: 1, events: 1 })
    })
  })
})

describe('getMatchCode', () => {
  describe('when the match is a numbered fixture round', () => {
    it('should give the code the scoresheet prints', () => {
      expect(getMatchCode('h-8')).toBe('H-8')
      expect(getMatchCode('d-12')).toBe('D-12')
    })
  })

  describe('when the match has no official number', () => {
    it('should give nothing rather than invent one', () => {
      expect(getMatchCode('h-rep-a')).toBe('')
      expect(getMatchCode('d-sf1')).toBe('')
      expect(getMatchCode('9f1c2b7a-0000-4000-8000-000000000000')).toBe('')
    })
  })
})
