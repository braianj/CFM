import { describe, expect, it } from 'vitest'
import type { MatchRosterEntry } from '../types/tournament'
import { calculateGoalkeeperStatistics, hasGoalkeeperLine } from './goalkeepers'

const entry = (overrides: Partial<MatchRosterEntry> = {}): MatchRosterEntry => ({
  id: 'h-8_bernales',
  matchId: 'h-8',
  category: 'men',
  teamId: 'men-cau-3',
  playerId: 'bernales',
  playerName: 'Joaquin Bernales',
  jerseyNumber: 50,
  ...overrides,
})

const only = (rosters: MatchRosterEntry[]) => calculateGoalkeeperStatistics('men', rosters)

describe('calculateGoalkeeperStatistics', () => {
  describe('when a goalkeeper faced shots', () => {
    it('should add the goals conceded to the saves to get the shots on target', () => {
      const [row] = only([entry({ saves: 17, goalsAgainst: 3, minutesPlayed: 30 })])

      expect(row).toMatchObject({ saves: 17, goalsAgainst: 3, shotsOnTarget: 20, minutes: 30, played: 1 })
    })

    it('should give the save percentage over the shots on target', () => {
      const [row] = only([entry({ saves: 15, goalsAgainst: 5 })])

      expect(row.savePercentage).toBeCloseTo(0.75)
    })

    it('should add up the matches', () => {
      const [row] = only([
        entry({ saves: 8, goalsAgainst: 2, minutesPlayed: 30 }),
        entry({ id: 'h-4_bernales', matchId: 'h-4', saves: 12, goalsAgainst: 0, minutesPlayed: 30 }),
      ])

      expect(row).toMatchObject({ played: 2, saves: 20, goalsAgainst: 2, shotsOnTarget: 22, minutes: 60 })
    })
  })

  describe('when two goalkeepers split a match', () => {
    it('should keep them apart', () => {
      const rows = only([
        entry({ saves: 5, goalsAgainst: 1, minutesPlayed: 20 }),
        entry({ id: 'h-8_lapertosa', playerId: 'lapertosa', playerName: 'Juan Lapertosa', jerseyNumber: 1, saves: 4, goalsAgainst: 0, minutesPlayed: 10 }),
      ])

      expect(rows).toHaveLength(2)
      expect(rows.map((row) => row.minutes)).toEqual([10, 20])
    })
  })

  describe('when the entry is an outfield player', () => {
    it('should not be counted as a goalkeeper', () => {
      expect(only([entry({ playerName: 'Martin Baeza', jerseyNumber: 92 })])).toEqual([])
    })
  })

  describe('when a goalkeeper line is only partly filled in', () => {
    it('should still count the match and treat the blank as nothing, not as a zero total', () => {
      const [row] = only([entry({ saves: 6 })])

      expect(row).toMatchObject({ played: 1, saves: 6, goalsAgainst: 0, shotsOnTarget: 6 })
      expect(row.savePercentage).toBe(1)
    })
  })

  describe('when a goalkeeper faced nothing at all', () => {
    it('should report no percentage rather than a perfect one', () => {
      const [row] = only([entry({ saves: 0, goalsAgainst: 0, minutesPlayed: 30 })])

      expect(row.savePercentage).toBeNull()
    })

    it('should list them after everybody who did face a shot', () => {
      const rows = only([
        entry({ saves: 0, goalsAgainst: 0, minutesPlayed: 30 }),
        entry({ id: 'other', playerId: 'x', playerName: 'Con tiros', saves: 1, goalsAgainst: 9 }),
      ])

      expect(rows.map((row) => row.playerName)).toEqual(['Con tiros', 'Joaquin Bernales'])
    })
  })

  describe('when the other tournament has its own goalkeepers', () => {
    it('should not mix them in', () => {
      const rows = only([
        entry({ saves: 3 }),
        entry({ id: 'd-1_x', category: 'women', teamId: 'women-cau-kipas', playerName: 'Otra', saves: 9 }),
      ])

      expect(rows).toHaveLength(1)
    })
  })

  describe('when ranking goalkeepers', () => {
    it('should put the better percentage first, and break a tie by volume', () => {
      const rows = only([
        entry({ id: 'a', playerId: 'a', playerName: 'Media', saves: 5, goalsAgainst: 5 }),
        entry({ id: 'b', playerId: 'b', playerName: 'Buena', saves: 9, goalsAgainst: 1 }),
        entry({ id: 'c', playerId: 'c', playerName: 'Mucho volumen', saves: 18, goalsAgainst: 2 }),
      ])

      expect(rows.map((row) => row.playerName)).toEqual(['Mucho volumen', 'Buena', 'Media'])
    })
  })
})

describe('hasGoalkeeperLine', () => {
  it('should be true as soon as any part of the line was written down', () => {
    expect(hasGoalkeeperLine(entry({ saves: 0 }))).toBe(true)
    expect(hasGoalkeeperLine(entry({ goalsAgainst: 0 }))).toBe(true)
    expect(hasGoalkeeperLine(entry({ minutesPlayed: 0 }))).toBe(true)
  })

  it('should be false for a plain call-up', () => {
    expect(hasGoalkeeperLine(entry())).toBe(false)
  })
})
