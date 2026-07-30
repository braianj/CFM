import { describe, expect, it } from 'vitest'
import type { Match, MatchEvent, MatchRosterEntry, Player, Team } from '../types/tournament'
import { buildPlayerRecord } from './playerRecord'

const teams: Team[] = [
  { id: 'men-cau-3', name: 'CAU Negro', category: 'men', shortName: 'Negro' },
  { id: 'men-ovejas-negras', name: 'Ovejas Negras', category: 'men', shortName: 'Ovejas' },
]

const matches: Match[] = [
  { id: 'h-4', category: 'men', startDateTime: '2026-07-26T21:30:00-03:00', stage: 'regular', homeTeamId: 'men-cau-3', awayTeamId: 'men-ovejas-negras', homeScore: 1, awayScore: 0, status: 'finished', countsForStandings: true },
  { id: 'h-8', category: 'men', startDateTime: '2026-07-28T21:30:00-03:00', stage: 'regular', homeTeamId: 'men-ovejas-negras', awayTeamId: 'men-cau-3', homeScore: 1, awayScore: 4, status: 'finished', countsForStandings: true },
]

const player: Player = { id: 'baeza', category: 'men', teamId: 'men-cau-3', name: 'Martin Baeza', active: true }
const other: Player = { id: 'val', category: 'men', teamId: 'men-cau-3', name: 'Francisco Val', active: true }

const callUp = (matchId: string, name: string, jerseyNumber: number): MatchRosterEntry => ({
  id: `${matchId}_${name}`, matchId, category: 'men', teamId: 'men-cau-3',
  playerId: name, playerName: name, jerseyNumber,
})

const event = (id: string, overrides: Partial<MatchEvent> = {}): MatchEvent => ({
  id, matchId: 'h-8', category: 'men', teamId: 'men-cau-3', type: 'goal',
  playerName: player.name, period: 1, gameTime: '8:45', ...overrides,
})

const record = (rosters: MatchRosterEntry[], events: MatchEvent[]) =>
  buildPlayerRecord(player, matches, teams, rosters, events)

describe('buildPlayerRecord', () => {
  describe('when the player scored and set one up', () => {
    it('should count the goal and the assist as a point each', () => {
      const built = record([callUp('h-8', player.name, 92)], [
        event('e1'),
        event('e2', { playerName: other.name, assistName: player.name }),
      ])

      expect(built).toMatchObject({ goals: 1, assists: 1, points: 2 })
    })

    it('should name who they did it with', () => {
      const built = record([callUp('h-8', player.name, 92)], [
        event('e1', { assistName: other.name }),
        event('e2', { playerName: other.name, secondAssistName: player.name }),
      ])

      const [goal, assist] = built.matches[0].actions
      expect(goal).toMatchObject({ type: 'goal', withPlayer: 'Francisco Val' })
      expect(assist).toMatchObject({ type: 'assist', withPlayer: 'Francisco Val' })
    })

    it('should read the clock as time played', () => {
      const built = record([callUp('h-8', player.name, 92)], [event('e1', { period: 1, gameTime: '8:45' })])

      expect(built.matches[0].actions[0].elapsed).toBe('6:15')
    })
  })

  describe('when the player was penalised', () => {
    it('should count the minutes and flag a major apart', () => {
      const built = record([callUp('h-8', player.name, 92)], [
        event('e1', { type: 'penalty', penaltyMinutes: 2 }),
        event('e2', { type: 'major-penalty', penaltyMinutes: 10 }),
      ])

      expect(built).toMatchObject({ penalties: 2, majorPenalties: 1, penaltyMinutes: 12, points: 0 })
    })
  })

  describe('when somebody else did it', () => {
    it('should not count them', () => {
      const built = record([callUp('h-8', player.name, 92)], [event('e1', { playerName: other.name })])

      expect(built).toMatchObject({ goals: 0, points: 0 })
      expect(built.matches[0].actions).toEqual([])
    })
  })

  describe('when a namesake plays for the other team', () => {
    it('should not borrow their events', () => {
      const built = record([callUp('h-8', player.name, 92)], [
        event('e1', { teamId: 'men-ovejas-negras' }),
      ])

      expect(built.goals).toBe(0)
    })
  })

  describe('when the player dressed for several matches', () => {
    it('should list the most recent first with the opponent and the number used', () => {
      const built = record(
        [callUp('h-4', player.name, 92), callUp('h-8', player.name, 4)],
        [event('e1')],
      )

      expect(built.played).toBe(2)
      expect(built.matches.map((item) => item.matchId)).toEqual(['h-8', 'h-4'])
      expect(built.matches[0]).toMatchObject({ opponent: 'Ovejas Negras', jerseyNumber: 4 })
      expect(built.matches[1]).toMatchObject({ opponent: 'Ovejas Negras', jerseyNumber: 92 })
    })

    it('should list a match without a call-up but with an event, without counting it played', () => {
      const built = record([], [event('e1')])

      expect(built.played).toBe(0)
      expect(built.matches.map((item) => item.matchId)).toEqual(['h-8'])
      expect(built.goals).toBe(1)
    })
  })

  describe('when the player has done nothing yet', () => {
    it('should still list the matches they dressed for', () => {
      const built = record([callUp('h-4', player.name, 92)], [])

      expect(built).toMatchObject({ played: 1, points: 0 })
      expect(built.matches[0].actions).toEqual([])
    })
  })
})
