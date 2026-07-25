import { describe, expect, it } from 'vitest'
import type { MatchEvent } from '../types/tournament'
import { calculateDiscipline } from './discipline'

const penalty = (overrides: Partial<MatchEvent> = {}): MatchEvent => ({
  id: crypto.randomUUID(),
  matchId: 'h-1',
  category: 'men',
  teamId: 'a',
  type: 'penalty',
  playerName: 'Ana',
  penaltyMinutes: 2,
  ...overrides,
})

describe('calculateDiscipline', () => {
  describe('when a player stays out of trouble', () => {
    it('should not report them at all', () => {
      expect(calculateDiscipline('men', [penalty(), penalty()])).toEqual([])
    })
  })

  describe('when a player takes three minors in one match', () => {
    it('should report the ejection and the match it happened in', () => {
      const rows = calculateDiscipline('men', [penalty(), penalty(), penalty()])

      expect(rows).toHaveLength(1)
      expect(rows[0]).toMatchObject({ minorPenalties: 3, ejectedFrom: ['h-1'] })
      expect(rows[0].reasons).toContain('three-minors')
    })
  })

  describe('when the three minors are spread across matches', () => {
    it('should not report an ejection', () => {
      const rows = calculateDiscipline('men', [
        penalty({ matchId: 'h-1' }),
        penalty({ matchId: 'h-2' }),
        penalty({ matchId: 'h-3' }),
      ])

      expect(rows).toEqual([])
    })
  })

  describe('when a player reaches fifteen penalty minutes', () => {
    it('should report the suspension', () => {
      const rows = calculateDiscipline('men', [
        penalty({ matchId: 'h-1', type: 'major-penalty', penaltyMinutes: 5 }),
        penalty({ matchId: 'h-2', type: 'major-penalty', penaltyMinutes: 5 }),
        penalty({ matchId: 'h-3', type: 'major-penalty', penaltyMinutes: 5 }),
      ])

      expect(rows[0]).toMatchObject({ penaltyMinutes: 15, majorPenalties: 3, minorPenalties: 0 })
      expect(rows[0].reasons).toEqual(['penalty-minutes'])
    })

    it('should not report them one minute short', () => {
      const rows = calculateDiscipline('men', [
        penalty({ matchId: 'h-1', penaltyMinutes: 7 }),
        penalty({ matchId: 'h-2', penaltyMinutes: 7 }),
      ])

      expect(rows).toEqual([])
    })
  })

  describe('when both rules fire', () => {
    it('should report both reasons', () => {
      const rows = calculateDiscipline('men', [
        penalty({ matchId: 'h-1', penaltyMinutes: 5 }),
        penalty({ matchId: 'h-1', penaltyMinutes: 5 }),
        penalty({ matchId: 'h-1', penaltyMinutes: 5 }),
      ])

      expect(rows[0].reasons).toEqual(['three-minors', 'penalty-minutes'])
    })
  })

  describe('when penalties belong to different people or tournaments', () => {
    it('should keep them apart', () => {
      const rows = calculateDiscipline('men', [
        penalty({ playerName: 'Ana' }),
        penalty({ playerName: 'Ana' }),
        penalty({ playerName: 'Ana' }),
        penalty({ playerName: 'Bruno' }),
        penalty({ playerName: 'Carla', category: 'women' }),
      ])

      expect(rows.map((row) => row.playerName)).toEqual(['Ana'])
    })

    it('should treat the same name on two teams as two people', () => {
      const rows = calculateDiscipline('men', [
        penalty({ teamId: 'a' }), penalty({ teamId: 'a' }), penalty({ teamId: 'a' }),
        penalty({ teamId: 'b' }), penalty({ teamId: 'b' }), penalty({ teamId: 'b' }),
      ])

      expect(rows.map((row) => row.teamId).sort()).toEqual(['a', 'b'])
    })
  })

  describe('when a name is typed with stray spacing or capitals', () => {
    it('should still add up to one player', () => {
      const rows = calculateDiscipline('men', [
        penalty({ playerName: 'Ana  Perez' }),
        penalty({ playerName: 'ANA PEREZ' }),
        penalty({ playerName: ' Ana Perez ' }),
      ])

      expect(rows).toHaveLength(1)
      expect(rows[0]).toMatchObject({ playerName: 'Ana Perez', minorPenalties: 3 })
    })
  })

  describe('when a penalty was saved without minutes', () => {
    it('should count the penalty and no minutes', () => {
      const rows = calculateDiscipline('men', [
        penalty({ penaltyMinutes: undefined }),
        penalty({ penaltyMinutes: undefined }),
        penalty({ penaltyMinutes: undefined }),
      ])

      expect(rows[0]).toMatchObject({ minorPenalties: 3, penaltyMinutes: 0 })
    })
  })
})
