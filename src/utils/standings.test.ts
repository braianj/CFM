import { beforeEach, describe, expect, it } from 'vitest'
import type { Match, ScoringRules, StandingRow, Team } from '../types/tournament'
import { calculateStandings } from './standings'

const createMatch = (overrides: Partial<Match> = {}): Match => ({
  id: 'match',
  category: 'men',
  startDateTime: '2026-07-24T10:00:00-03:00',
  stage: 'regular',
  homeTeamId: 'a',
  awayTeamId: 'b',
  homeScore: 2,
  awayScore: 1,
  status: 'finished',
  countsForStandings: true,
  ...overrides,
})

describe('calculateStandings', () => {
  let scoring: ScoringRules
  let teams: Team[]

  beforeEach(() => {
    scoring = { win: 3, draw: 1, loss: 0 }
    teams = [
      { id: 'a', name: 'A', shortName: 'A', category: 'men' },
      { id: 'b', name: 'B', shortName: 'B', category: 'men' },
      { id: 'c', name: 'C', shortName: 'C', category: 'men' },
      { id: 'd', name: 'D', shortName: 'D', category: 'men' },
      { id: 'w', name: 'W', shortName: 'W', category: 'women' },
    ]
  })

  describe('when processing a win', () => {
    let standings: StandingRow[]

    beforeEach(() => {
      standings = calculateStandings('men', teams, [createMatch()], scoring)
    })

    it('should award three points to the winner', () => {
      expect(standings.find((row) => row.team.id === 'a')).toMatchObject({ won: 1, points: 3 })
    })

    it('should record one loss for the defeated team', () => {
      expect(standings.find((row) => row.team.id === 'b')).toMatchObject({ lost: 1, points: 0 })
    })
  })

  describe('when processing a draw', () => {
    let standings: StandingRow[]

    beforeEach(() => {
      standings = calculateStandings(
        'men',
        teams,
        [createMatch({ homeScore: 2, awayScore: 2 })],
        scoring,
      )
    })

    it('should award one point to both teams', () => {
      expect(
        standings
          .filter((row) => ['a', 'b'].includes(row.team.id))
          .map((row) => row.points),
      ).toEqual([1, 1])
    })
  })

  describe('when processing a zero-zero result', () => {
    let standings: StandingRow[]

    beforeEach(() => {
      standings = calculateStandings(
        'men',
        teams,
        [createMatch({ homeScore: 0, awayScore: 0 })],
        scoring,
      )
    })

    it('should count the match as a draw', () => {
      expect(standings.find((row) => row.team.id === 'a')).toMatchObject({ played: 1, drawn: 1 })
    })
  })

  describe('when a match has no complete result', () => {
    let standings: StandingRow[]

    beforeEach(() => {
      standings = calculateStandings(
        'men',
        teams,
        [createMatch({ awayScore: null })],
        scoring,
      )
    })

    it('should ignore the match', () => {
      expect(standings.every((row) => row.played === 0)).toBe(true)
    })
  })

  describe('when a match does not count for standings', () => {
    let standings: StandingRow[]

    beforeEach(() => {
      standings = calculateStandings(
        'men',
        teams,
        [createMatch({ stage: 'final-a', countsForStandings: false })],
        scoring,
      )
    })

    it('should ignore the playoff result', () => {
      expect(standings.every((row) => row.played === 0)).toBe(true)
    })
  })

  describe('when calculating the women’s tournament', () => {
    let standings: StandingRow[]

    beforeEach(() => {
      standings = calculateStandings(
        'women',
        teams,
        [
          createMatch(),
          createMatch({
            id: 'women',
            category: 'women',
            homeTeamId: 'w',
            awayTeamId: 'w',
          }),
        ],
        scoring,
      )
    })

    it('should keep the tournament categories independent', () => {
      expect(standings.map((row) => row.team.id)).toEqual(['w'])
    })
  })

  describe('when teams have different points', () => {
    let standings: StandingRow[]

    beforeEach(() => {
      standings = calculateStandings('men', teams, [createMatch()], scoring)
    })

    it('should rank the team with more points first', () => {
      expect(standings[0].team.id).toBe('a')
    })
  })

  describe('when exactly two teams have equal points', () => {
    let standings: StandingRow[]

    beforeEach(() => {
      const matches = [
        createMatch({
          id: 'b-beats-a',
          homeTeamId: 'b',
          awayTeamId: 'a',
          homeScore: 1,
          awayScore: 0,
        }),
        createMatch({
          id: 'a-big-win-c',
          homeTeamId: 'a',
          awayTeamId: 'c',
          homeScore: 8,
          awayScore: 0,
        }),
        createMatch({
          id: 'a-big-win-d',
          homeTeamId: 'a',
          awayTeamId: 'd',
          homeScore: 8,
          awayScore: 0,
        }),
        createMatch({
          id: 'b-small-win-d',
          homeTeamId: 'b',
          awayTeamId: 'd',
          homeScore: 1,
          awayScore: 0,
        }),
        createMatch({
          id: 'b-loses-c',
          homeTeamId: 'b',
          awayTeamId: 'c',
          homeScore: 0,
          awayScore: 1,
        }),
      ]
      standings = calculateStandings('men', teams, matches, scoring)
    })

    it('should rank the direct-match winner above the team with better overall goal difference', () => {
      expect(standings.slice(0, 2).map((row) => row.team.id)).toEqual(['b', 'a'])
    })
  })

  describe('when exactly three teams have equal points', () => {
    let internalMatches: Match[]

    beforeEach(() => {
      internalMatches = [
        createMatch({
          id: 'a-b',
          homeTeamId: 'a',
          awayTeamId: 'b',
          homeScore: 3,
          awayScore: 1,
        }),
        createMatch({
          id: 'b-c',
          homeTeamId: 'b',
          awayTeamId: 'c',
          homeScore: 2,
          awayScore: 0,
        }),
        createMatch({
          id: 'c-a',
          homeTeamId: 'c',
          awayTeamId: 'a',
          homeScore: 1,
          awayScore: 0,
        }),
      ]
    })

    describe('and the internal wins form a cycle', () => {
      let standings: StandingRow[]

      beforeEach(() => {
        standings = calculateStandings('men', teams, internalMatches, scoring)
      })

      it('should rank teams by goal difference from only the tied-team matches', () => {
        expect(standings.slice(0, 3).map((row) => row.team.id)).toEqual(['a', 'b', 'c'])
      })
    })

    describe('and matches against a fourth team change overall goal difference', () => {
      let standings: StandingRow[]

      beforeEach(() => {
        const externalMatches = [
          createMatch({
            id: 'a-d',
            homeTeamId: 'a',
            awayTeamId: 'd',
            homeScore: 1,
            awayScore: 0,
          }),
          createMatch({
            id: 'b-d',
            homeTeamId: 'b',
            awayTeamId: 'd',
            homeScore: 1,
            awayScore: 0,
          }),
          createMatch({
            id: 'c-d',
            homeTeamId: 'c',
            awayTeamId: 'd',
            homeScore: 10,
            awayScore: 0,
          }),
        ]
        standings = calculateStandings(
          'men',
          teams,
          [...internalMatches, ...externalMatches],
          scoring,
        )
      })

      it('should ignore the external goals in the three-team mini-table', () => {
        expect(standings.slice(0, 3).map((row) => row.team.id)).toEqual(['a', 'b', 'c'])
      })
    })
  })
})
