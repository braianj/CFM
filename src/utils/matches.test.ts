import { describe, expect, it } from 'vitest'
import type { Match } from '../types/tournament'
import {
  ALL_TEAMS,
  filterMatchesByTeam,
  getInitialMatchId,
  groupMatchesByDay,
  isOfficialFixturePublished,
} from './matches'

const match = (id: string, startDateTime: string, status: Match['status']): Match => ({
  id,
  category: 'men',
  startDateTime,
  stage: 'regular',
  homeTeamId: 'a',
  awayTeamId: 'b',
  homeScore: null,
  awayScore: null,
  status,
  countsForStandings: true,
})

describe('getInitialMatchId', () => {
  const finished = match('finished', '2026-07-23T10:00:00-03:00', 'finished')
  const upcoming = match('upcoming', '2026-07-24T10:00:00-03:00', 'upcoming')
  const live = match('live', '2026-07-24T12:00:00-03:00', 'live')

  it('prioritizes the first live match', () => {
    expect(getInitialMatchId([upcoming, live, finished])).toBe('live')
  })

  it('uses the next upcoming match when none are live', () => {
    expect(getInitialMatchId([upcoming, finished])).toBe('upcoming')
  })

  it('uses the final chronological match when every match is finished', () => {
    expect(getInitialMatchId([finished, { ...finished, id: 'last', startDateTime: '2026-07-25T10:00:00-03:00' }])).toBe('last')
  })
})

describe('filterMatchesByTeam', () => {
  const home = match('home', '2026-07-25T10:00:00-03:00', 'upcoming')
  const away = { ...match('away', '2026-07-25T12:00:00-03:00', 'upcoming'), homeTeamId: 'c', awayTeamId: 'a' }
  const other = { ...match('other', '2026-07-25T14:00:00-03:00', 'upcoming'), homeTeamId: 'b', awayTeamId: 'c' }
  const pending: Match = {
    ...match('pending', '2026-07-26T10:00:00-03:00', 'tbd'),
    stage: 'final-a',
    homeTeamId: undefined,
    awayTeamId: undefined,
    homeLabel: '1.º de fase regular',
    awayLabel: 'Ganador del Repechaje A',
    countsForStandings: false,
  }
  const all = [home, away, other, pending]

  describe('when no team is selected', () => {
    it('should keep every match', () => {
      expect(filterMatchesByTeam(all, ALL_TEAMS)).toEqual(all)
    })
  })

  describe('when a team is selected', () => {
    it('should keep the matches it plays at home and away', () => {
      expect(filterMatchesByTeam(all, 'a').map((item) => item.id)).toContain('home')
      expect(filterMatchesByTeam(all, 'a').map((item) => item.id)).toContain('away')
    })

    it('should drop the matches between other teams', () => {
      expect(filterMatchesByTeam(all, 'a').map((item) => item.id)).not.toContain('other')
    })

    it('should keep the playoff matches it could still reach', () => {
      expect(filterMatchesByTeam(all, 'a').map((item) => item.id)).toContain('pending')
    })
  })

  describe('when the selected team plays no match', () => {
    it('should keep only the undecided playoff matches', () => {
      expect(filterMatchesByTeam(all, 'unknown').map((item) => item.id)).toEqual(['pending'])
    })
  })
})

describe('isOfficialFixturePublished', () => {
  const official = [match('a', '2026-07-25T10:00:00-03:00', 'upcoming'), match('b', '2026-07-25T12:00:00-03:00', 'upcoming')]

  describe('when the published schedule holds the official matches', () => {
    it('should report the fixture as published', () => {
      expect(isOfficialFixturePublished([...official].reverse(), official)).toBe(true)
    })
  })

  describe('when the published schedule still holds other matches', () => {
    it('should report the fixture as pending', () => {
      expect(isOfficialFixturePublished([match('old', '2026-07-23T10:00:00-03:00', 'finished')], official)).toBe(false)
    })
  })

  describe('when the published schedule keeps leftovers alongside the official matches', () => {
    it('should report the fixture as pending', () => {
      const leftovers = [...official, match('old', '2026-07-23T10:00:00-03:00', 'finished')]

      expect(isOfficialFixturePublished(leftovers, official)).toBe(false)
    })
  })
})

describe('groupMatchesByDay', () => {
  it('groups and sorts matches chronologically', () => {
    const groups = groupMatchesByDay(
      [
        match('later', '2026-07-25T12:00:00-03:00', 'upcoming'),
        match('first', '2026-07-24T12:00:00-03:00', 'upcoming'),
      ],
      'America/Argentina/Ushuaia',
    )
    expect(groups.map((group) => group.matches[0].id)).toEqual(['first', 'later'])
  })
})
