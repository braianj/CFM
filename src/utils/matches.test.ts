import { describe, expect, it } from 'vitest'
import type { Match } from '../types/tournament'
import { getInitialMatchId, groupMatchesByDay } from './matches'

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
