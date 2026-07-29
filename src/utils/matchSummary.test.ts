import { describe, expect, it } from 'vitest'
import type { MatchEvent, MatchRosterEntry, Team } from '../types/tournament'
import { buildMatchSummary } from './matchSummary'

const teams: Team[] = [
  { id: 'men-cau-3', name: 'CAU Negro', category: 'men', shortName: 'Negro' },
  { id: 'men-cau-2', name: 'CAU Verde', category: 'men', shortName: 'Verde' },
]

const event = (id: string, overrides: Partial<MatchEvent> = {}): MatchEvent => ({
  id,
  matchId: 'h-1',
  category: 'men',
  teamId: 'men-cau-3',
  type: 'goal',
  playerName: id,
  ...overrides,
})

const rosterEntry = (playerName: string, jerseyNumber: number): MatchRosterEntry => ({
  id: `h-1_${playerName}`,
  matchId: 'h-1',
  category: 'men',
  teamId: 'men-cau-3',
  playerId: playerName,
  playerName,
  jerseyNumber,
})

const ids = (events: MatchEvent[], rosters: MatchRosterEntry[] = []) =>
  buildMatchSummary('h-1', events, teams, rosters).map((line) => line.id)

describe('buildMatchSummary', () => {
  describe('when the events belong to several periods', () => {
    it('should read the periods in playing order', () => {
      const listed = ids([
        event('segundo', { period: 2, gameTime: '14:00' }),
        event('primero', { period: 1, gameTime: '2:50' }),
      ])

      expect(listed).toEqual(['primero', 'segundo'])
    })
  })

  describe('when several events share a period', () => {
    it('should order them by the countdown clock, not by the number', () => {
      const listed = ids([
        event('tarde', { period: 1, gameTime: '0:50' }),
        event('temprano', { period: 1, gameTime: '12:52' }),
        event('medio', { period: 1, gameTime: '6:38' }),
      ])

      expect(listed).toEqual(['temprano', 'medio', 'tarde'])
    })
  })

  describe('when the scoresheet left the clock blank', () => {
    it('should sink the event to the end of its own period', () => {
      const listed = ids([
        event('sin-reloj', { period: 1 }),
        event('con-reloj', { period: 1, gameTime: '0:12' }),
        event('periodo-dos', { period: 2, gameTime: '14:00' }),
      ])

      expect(listed).toEqual(['con-reloj', 'sin-reloj', 'periodo-dos'])
    })
  })

  describe('when the scoresheet left the period blank', () => {
    it('should list the event after every period', () => {
      const listed = ids([
        event('sin-periodo', { gameTime: '14:00' }),
        event('periodo-dos', { period: 2, gameTime: '0:01' }),
      ])

      expect(listed).toEqual(['periodo-dos', 'sin-periodo'])
    })
  })

  describe('when the tournament has events from other matches', () => {
    it('should only summarise the requested one', () => {
      const listed = ids([event('propio'), event('ajeno', { matchId: 'h-2' })])

      expect(listed).toEqual(['propio'])
    })
  })

  describe('when a goal has assists', () => {
    it('should take their jersey numbers from this match roster', () => {
      const [line] = buildMatchSummary(
        'h-1',
        [event('gol', { playerName: 'Martín Baeza', jerseyNumber: 92, assistName: 'Juan Pérez' })],
        teams,
        [rosterEntry('Juan Pérez', 64)],
      )

      expect(line.player).toBe('#92 Martín Baeza')
      expect(line.assists).toEqual(['#64 Juan Pérez'])
    })

    it('should name a player with no number instead of hiding them', () => {
      const [line] = buildMatchSummary('h-1', [event('gol', { playerName: 'Martín Baeza' })], teams)

      expect(line.player).toBe('Martín Baeza')
    })
  })

  describe('when a player is only in another match roster', () => {
    it('should not borrow that number', () => {
      const [line] = buildMatchSummary(
        'h-1',
        [event('gol', { playerName: 'Martín Baeza', assistName: 'Juan Pérez' })],
        teams,
        [{ ...rosterEntry('Juan Pérez', 64), matchId: 'h-2' }],
      )

      expect(line.assists).toEqual(['Juan Pérez'])
    })
  })

  describe('when a penalty carries leftover goal fields', () => {
    it('should drop the assists and keep the minutes', () => {
      const [line] = buildMatchSummary(
        'h-1',
        [event('falta', { type: 'penalty', assistName: 'Juan Pérez', penaltyMinutes: 2 })],
        teams,
      )

      expect(line.assists).toEqual([])
      expect(line.penaltyMinutes).toBe(2)
    })
  })

  describe('when a goal carries leftover penalty minutes', () => {
    it('should not report them', () => {
      const [line] = buildMatchSummary('h-1', [event('gol', { penaltyMinutes: 2 })], teams)

      expect(line.penaltyMinutes).toBeUndefined()
    })
  })

  describe('when the event names a team', () => {
    it('should resolve its public name', () => {
      const [line] = buildMatchSummary('h-1', [event('gol', { teamId: 'men-cau-2' })], teams)

      expect(line.teamName).toBe('CAU Verde')
    })
  })
})
