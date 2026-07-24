import { describe, expect, it } from 'vitest'
import type { Match, Team } from '../types/tournament'
import { calculateStandings } from './standings'

const scoring = { win: 3, draw: 1, loss: 0 }
const teams: Team[] = [
  { id: 'a', name: 'A', shortName: 'A', category: 'men' },
  { id: 'b', name: 'B', shortName: 'B', category: 'men' },
  { id: 'c', name: 'C', shortName: 'C', category: 'men' },
  { id: 'w', name: 'W', shortName: 'W', category: 'women' },
]

const match = (overrides: Partial<Match> = {}): Match => ({
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
  it('awards a win and a loss', () => {
    const result = calculateStandings('men', teams, [match()], scoring)
    expect(result.find((row) => row.team.id === 'a')).toMatchObject({ won: 1, points: 3 })
    expect(result.find((row) => row.team.id === 'b')).toMatchObject({ lost: 1, points: 0 })
  })

  it('awards a draw to both teams', () => {
    const result = calculateStandings('men', teams, [match({ homeScore: 2, awayScore: 2 })], scoring)
    expect(result.slice(0, 2).map((row) => row.drawn)).toEqual([1, 1])
    expect(result.slice(0, 2).map((row) => row.points)).toEqual([1, 1])
  })

  it('counts a zero-zero result as a draw', () => {
    const result = calculateStandings('men', teams, [match({ homeScore: 0, awayScore: 0 })], scoring)
    expect(result.find((row) => row.team.id === 'a')).toMatchObject({ played: 1, drawn: 1 })
  })

  it('ignores a match without both scores', () => {
    const result = calculateStandings('men', teams, [match({ awayScore: null })], scoring)
    expect(result.every((row) => row.played === 0)).toBe(true)
  })

  it('ignores a playoff match', () => {
    const result = calculateStandings(
      'men',
      teams,
      [match({ stage: 'final-a', countsForStandings: false })],
      scoring,
    )
    expect(result.every((row) => row.played === 0)).toBe(true)
  })

  it('keeps tournament categories independent', () => {
    const result = calculateStandings(
      'women',
      teams,
      [match(), match({ id: 'women', category: 'women', homeTeamId: 'w', awayTeamId: 'w' })],
      scoring,
    )
    expect(result).toHaveLength(1)
    expect(result[0].team.id).toBe('w')
  })

  it('sorts by points first', () => {
    const result = calculateStandings('men', teams, [match()], scoring)
    expect(result[0].team.id).toBe('a')
  })

  it('uses goal difference as the first tiebreaker', () => {
    const result = calculateStandings(
      'men',
      teams,
      [
        match({ id: 'one', homeTeamId: 'a', awayTeamId: 'c', homeScore: 3, awayScore: 0 }),
        match({ id: 'two', homeTeamId: 'b', awayTeamId: 'c', homeScore: 1, awayScore: 0 }),
      ],
      scoring,
    )
    expect(result.slice(0, 2).map((row) => row.team.id)).toEqual(['a', 'b'])
  })

  it('uses goals scored when points and goal difference are tied', () => {
    const result = calculateStandings(
      'men',
      teams,
      [
        match({ id: 'one', homeTeamId: 'a', awayTeamId: 'c', homeScore: 3, awayScore: 2 }),
        match({ id: 'two', homeTeamId: 'b', awayTeamId: 'c', homeScore: 1, awayScore: 0 }),
      ],
      scoring,
    )
    expect(result.slice(0, 2).map((row) => row.team.id)).toEqual(['a', 'b'])
  })
})
