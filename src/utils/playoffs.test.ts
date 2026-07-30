import { describe, expect, it } from 'vitest'
import type { Match, MatchStage, Team } from '../types/tournament'
import { resolvePlayoffParticipants } from './playoffs'

const women: Team[] = [
  { id: 'w1', name: 'Uno', category: 'women', shortName: 'Uno' },
  { id: 'w2', name: 'Dos', category: 'women', shortName: 'Dos' },
  { id: 'w3', name: 'Tres', category: 'women', shortName: 'Tres' },
  { id: 'w4', name: 'Cuatro', category: 'women', shortName: 'Cuatro' },
  { id: 'w5', name: 'Cinco', category: 'women', shortName: 'Cinco' },
]

const regular = (id: string, home: string, away: string, homeScore: number, awayScore: number): Match => ({
  id, category: 'women', startDateTime: `2026-07-2${id.length}T20:00:00-03:00`, stage: 'regular',
  homeTeamId: home, awayTeamId: away, homeScore, awayScore, status: 'finished', countsForStandings: true,
})

const playoff = (stage: MatchStage, overrides: Partial<Match> = {}): Match => ({
  id: `p-${stage}`, category: 'women', startDateTime: '2026-08-01T20:00:00-03:00', stage,
  homeLabel: 'A confirmar', awayLabel: 'A confirmar',
  homeScore: null, awayScore: null, status: 'tbd', countsForStandings: false, ...overrides,
})

// Uno wins everything, then Dos, Tres, Cuatro, Cinco: a clean 1-2-3-4-5 table.
const roundRobin = () => [
  regular('a', 'w1', 'w2', 5, 0), regular('bb', 'w1', 'w3', 5, 0),
  regular('ccc', 'w1', 'w4', 5, 0), regular('dddd', 'w1', 'w5', 5, 0),
  regular('eeeee', 'w2', 'w3', 4, 0), regular('ffffff', 'w2', 'w4', 4, 0),
  regular('ggggggg', 'w2', 'w5', 4, 0), regular('hhhhhhhh', 'w3', 'w4', 3, 0),
  regular('iiiiiiiii', 'w3', 'w5', 3, 0), regular('jjjjjjjjjj', 'w4', 'w5', 2, 0),
]

const find = (matches: Match[], stage: MatchStage) => matches.find((match) => match.stage === stage)!

describe('resolvePlayoffParticipants', () => {
  describe('when the regular phase is over', () => {
    it('should seed the first round from the table', () => {
      const resolved = resolvePlayoffParticipants(
        [...roundRobin(), playoff('repechaje'), playoff('semifinal-2')],
        women,
      )

      // Fifth against fourth, and second against third.
      expect(find(resolved, 'repechaje')).toMatchObject({ homeTeamId: 'w5', awayTeamId: 'w4' })
      expect(find(resolved, 'semifinal-2')).toMatchObject({ homeTeamId: 'w2', awayTeamId: 'w3' })
    })

    it('should leave a later round waiting until the one before it is played', () => {
      const resolved = resolvePlayoffParticipants(
        [...roundRobin(), playoff('repechaje'), playoff('semifinal-1')],
        women,
      )

      const semifinal = find(resolved, 'semifinal-1')
      expect(semifinal.homeTeamId).toBeUndefined()
      // The seeded half is known even while the other one is not.
      expect(semifinal.awayTeamId).toBe('w1')
    })
  })

  describe('when an earlier round has been played', () => {
    const played = () => [
      ...roundRobin(),
      playoff('repechaje', { homeTeamId: 'w5', awayTeamId: 'w4', homeScore: 3, awayScore: 1, status: 'finished' }),
      playoff('semifinal-2', { homeTeamId: 'w2', awayTeamId: 'w3', homeScore: 0, awayScore: 2, status: 'finished' }),
      playoff('semifinal-1'),
      playoff('third-place'),
      playoff('final'),
    ]

    it('should carry the winner into the next round', () => {
      const resolved = resolvePlayoffParticipants(played(), women)

      expect(find(resolved, 'semifinal-1')).toMatchObject({ homeTeamId: 'w5', awayTeamId: 'w1' })
    })

    it('should carry the loser into the third place match', () => {
      const resolved = resolvePlayoffParticipants([
        ...played().filter((match) => match.stage !== 'semifinal-1'),
        playoff('semifinal-1', { homeTeamId: 'w5', awayTeamId: 'w1', homeScore: 1, awayScore: 4, status: 'finished' }),
      ], women)

      expect(find(resolved, 'third-place')).toMatchObject({ homeTeamId: 'w5', awayTeamId: 'w2' })
      expect(find(resolved, 'final')).toMatchObject({ homeTeamId: 'w1', awayTeamId: 'w3' })
    })
  })

  describe('when the regular phase is still being played', () => {
    it('should not seed anything, because the table can still move', () => {
      const unfinished = roundRobin().map((match, index) =>
        index === 0 ? { ...match, homeScore: null, awayScore: null, status: 'upcoming' as const } : match)

      const resolved = resolvePlayoffParticipants([...unfinished, playoff('repechaje')], women)

      expect(find(resolved, 'repechaje').homeTeamId).toBeUndefined()
    })
  })

  describe('when the organisation named a participant by hand', () => {
    it('should never overwrite it', () => {
      const resolved = resolvePlayoffParticipants(
        [...roundRobin(), playoff('repechaje', { homeTeamId: 'w3' })],
        women,
      )

      expect(find(resolved, 'repechaje')).toMatchObject({ homeTeamId: 'w3', awayTeamId: 'w4' })
    })
  })

  describe('when a playoff match somehow ended level', () => {
    it('should refuse to pick a winner', () => {
      const resolved = resolvePlayoffParticipants([
        ...roundRobin(),
        playoff('repechaje', { homeTeamId: 'w5', awayTeamId: 'w4', homeScore: 2, awayScore: 2, status: 'finished' }),
        playoff('semifinal-1'),
      ], women)

      expect(find(resolved, 'semifinal-1').homeTeamId).toBeUndefined()
    })
  })

  describe('when nothing can be derived', () => {
    it('should give back the very same array', () => {
      const matches = [playoff('repechaje')]

      expect(resolvePlayoffParticipants(matches, women)).toBe(matches)
    })
  })
})
