import { describe, expect, it } from 'vitest'
import type { Category, Match } from '../types/tournament'
import { getMatchesByCategory, matches } from './matches'
import { getTeamsByCategory, teams } from './teams'
import { MATCH_DURATION_MINUTES } from '../utils/matchStatus'

const regularMatches = (category: Category) =>
  getMatchesByCategory(category).filter((match) => match.stage === 'regular')

const playedCount = (category: Category, teamId: string) =>
  regularMatches(category).filter((match) => match.homeTeamId === teamId || match.awayTeamId === teamId).length

const pairKey = (match: Match) => [match.homeTeamId, match.awayTeamId].sort().join('|')

describe('official fixture data', () => {
  describe('when checking match identity', () => {
    it('should keep every match ID unique', () => {
      expect(new Set(matches.map((match) => match.id)).size).toBe(matches.length)
    })

    it('should reference only existing teams from its own category', () => {
      const idsByCategory = new Map(
        (['men', 'women'] as Category[]).map((category) => [
          category,
          new Set(getTeamsByCategory(category).map((team) => team.id)),
        ]),
      )

      matches.forEach((match) => {
        const allowed = idsByCategory.get(match.category)!
        if (match.homeTeamId) expect(allowed.has(match.homeTeamId)).toBe(true)
        if (match.awayTeamId) expect(allowed.has(match.awayTeamId)).toBe(true)
      })
    })

    it('should never schedule a team against itself', () => {
      matches.forEach((match) => {
        if (!match.homeTeamId || !match.awayTeamId) return
        expect(match.homeTeamId).not.toBe(match.awayTeamId)
      })
    })
  })

  describe('when checking the men’s regular phase', () => {
    it('should schedule a single round robin of fifteen matches', () => {
      const men = regularMatches('men')

      expect(men).toHaveLength(15)
      expect(new Set(men.map(pairKey)).size).toBe(15)
    })

    it('should give every team five matches', () => {
      getTeamsByCategory('men').forEach((team) => {
        expect(playedCount('men', team.id)).toBe(5)
      })
    })
  })

  describe('when checking the women’s regular phase', () => {
    it('should schedule a single round robin of ten matches', () => {
      const women = regularMatches('women')

      expect(women).toHaveLength(10)
      expect(new Set(women.map(pairKey)).size).toBe(10)
    })

    it('should give every team four matches', () => {
      getTeamsByCategory('women').forEach((team) => {
        expect(playedCount('women', team.id)).toBe(4)
      })
    })
  })

  describe('when checking the playoff phase', () => {
    it('should keep playoff matches out of the standings', () => {
      matches
        .filter((match) => match.stage !== 'regular')
        .forEach((match) => expect(match.countsForStandings).toBe(false))
    })

    it('should describe every pending playoff participant with a label', () => {
      matches
        .filter((match) => match.stage !== 'regular')
        .forEach((match) => {
          expect(match.homeTeamId ?? match.homeLabel).toBeTruthy()
          expect(match.awayTeamId ?? match.awayLabel).toBeTruthy()
        })
    })

    it('should run each playoff round after the regular phase closes', () => {
      const lastRegular = Math.max(
        ...matches.filter((match) => match.stage === 'regular').map((match) => new Date(match.startDateTime).getTime()),
      )

      matches
        .filter((match) => match.stage !== 'regular')
        .forEach((match) => expect(new Date(match.startDateTime).getTime()).toBeGreaterThan(lastRegular))
    })
  })

  describe('when checking the schedule grid', () => {
    it('should start every match on Ushuaia time', () => {
      matches.forEach((match) => expect(match.startDateTime.endsWith('-03:00')).toBe(true))
    })

    it('should never overlap two matches in the same slot', () => {
      const starts = matches.map((match) => match.startDateTime)

      expect(new Set(starts).size).toBe(starts.length)
    })

    it('should fit a whole match inside the gap before the next one', () => {
      const starts = matches
        .map((match) => new Date(match.startDateTime).getTime())
        .sort((first, second) => first - second)
      const smallestGap = Math.min(
        ...starts.slice(1).map((start, index) => (start - starts[index]) / 60_000),
      )

      expect(MATCH_DURATION_MINUTES).toBeLessThanOrEqual(smallestGap)
    })
  })

  describe('when checking team coverage', () => {
    it('should schedule every registered team', () => {
      const scheduled = new Set(
        matches.flatMap((match) => [match.homeTeamId, match.awayTeamId]).filter(Boolean),
      )

      teams.forEach((team) => expect(scheduled.has(team.id)).toBe(true))
    })
  })
})
