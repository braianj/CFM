import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import type { MatchEvent, MatchRosterEntry } from '../types/tournament'
import { calculatePlayerStatistics } from './statistics'

describe('calculatePlayerStatistics', () => {
  describe('when events include goals, assists and penalties', () => {
    let events: MatchEvent[]

    beforeEach(() => {
      events = [
        { id: '1', matchId: 'm1', category: 'men', teamId: 'a', type: 'goal', playerName: 'Ana', assistName: 'Beto', secondAssistName: 'Carla' },
        { id: '2', matchId: 'm1', category: 'men', teamId: 'a', type: 'major-penalty', playerName: 'Ana', penaltyMinutes: 5 },
      ]
    })

    afterEach(() => {
      events = []
    })

    it('should aggregate the scorer statistics', () => {
      expect(calculatePlayerStatistics('men', events)[0]).toMatchObject({
        playerName: 'Ana', goals: 1, majorPenalties: 1, penaltyMinutes: 5,
      })
    })

    it('should credit the assist to a separate player', () => {
      expect(calculatePlayerStatistics('men', events)[1].assists).toBe(1)
    })

    it('should credit a second assist', () => {
      expect(calculatePlayerStatistics('men', events).find((row) => row.playerName === 'Carla')?.assists).toBe(1)
    })

    it('should calculate points from goals and assists', () => {
      expect(calculatePlayerStatistics('men', events)[0].points).toBe(1)
    })
  })

  describe('when another tournament has events', () => {
    let events: MatchEvent[]

    beforeEach(() => {
      events = [
        { id: '1', matchId: 'm1', category: 'men', teamId: 'a', type: 'goal', playerName: 'Alex' },
        { id: '2', matchId: 'w1', category: 'women', teamId: 'b', type: 'goal', playerName: 'Alex' },
      ]
    })

    afterEach(() => {
      events = []
    })

    it('should keep tournament statistics independent', () => {
      expect(calculatePlayerStatistics('women', events)[0].teamId).toBe('b')
    })
  })
})

describe('games played', () => {
  const roster = (matchId: string, playerName: string, overrides: Partial<MatchRosterEntry> = {}): MatchRosterEntry => ({
    id: `${matchId}-${playerName}`,
    matchId,
    category: 'men',
    teamId: 'a',
    playerId: playerName,
    playerName,
    jerseyNumber: 9,
    ...overrides,
  })

  describe('when a player dressed for several matches', () => {
    it('should count one match each', () => {
      const rows = calculatePlayerStatistics('men', [], [roster('m1', 'Ana'), roster('m2', 'Ana')])

      expect(rows.find((row) => row.playerName === 'Ana')?.played).toBe(2)
    })
  })

  describe('when the roster holds the same player twice for one match', () => {
    it('should still count a single match', () => {
      const rows = calculatePlayerStatistics('men', [], [
        roster('m1', 'Ana'),
        { ...roster('m1', 'Ana'), id: 'duplicado' },
      ])

      expect(rows.find((row) => row.playerName === 'Ana')?.played).toBe(1)
    })
  })

  describe('when a player dressed but did nothing', () => {
    it('should still be listed with zeros', () => {
      const rows = calculatePlayerStatistics('men', [], [roster('m1', 'Ana')])

      expect(rows).toHaveLength(1)
      expect(rows[0]).toMatchObject({ playerName: 'Ana', played: 1, goals: 0, points: 0 })
    })
  })

  describe('when the roster belongs to the other tournament', () => {
    it('should not be counted', () => {
      const rows = calculatePlayerStatistics('men', [], [roster('m1', 'Ana', { category: 'women' })])

      expect(rows).toHaveLength(0)
    })
  })

  describe('when a player scored without appearing on any roster', () => {
    it('should show no matches played rather than crash', () => {
      const rows = calculatePlayerStatistics('men', [
        { id: 'e1', matchId: 'm1', category: 'men', teamId: 'a', type: 'goal', playerName: 'Ana' },
      ], [])

      expect(rows[0]).toMatchObject({ playerName: 'Ana', goals: 1, played: 0 })
    })
  })
})
