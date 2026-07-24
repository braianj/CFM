import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import type { MatchEvent } from '../types/tournament'
import { calculatePlayerStatistics } from './statistics'

describe('calculatePlayerStatistics', () => {
  describe('when events include goals, assists and penalties', () => {
    let events: MatchEvent[]

    beforeEach(() => {
      events = [
        { id: '1', matchId: 'm1', category: 'men', teamId: 'a', type: 'goal', playerName: 'Ana', assistName: 'Beto' },
        { id: '2', matchId: 'm1', category: 'men', teamId: 'a', type: 'major-penalty', playerName: 'Ana', penaltyMinutes: 5 },
      ]
    })

    afterEach(() => {
      events = []
    })

    it('should aggregate the scorer statistics', () => {
      expect(calculatePlayerStatistics('men', events)[0]).toMatchObject({
        playerName: 'Ana', goals: 1, majorPenalties: 1, penaltyMinutes: 5,
      })
    })

    it('should credit the assist to a separate player', () => {
      expect(calculatePlayerStatistics('men', events)[1].assists).toBe(1)
    })
  })

  describe('when another tournament has events', () => {
    let events: MatchEvent[]

    beforeEach(() => {
      events = [
        { id: '1', matchId: 'm1', category: 'men', teamId: 'a', type: 'goal', playerName: 'Alex' },
        { id: '2', matchId: 'w1', category: 'women', teamId: 'b', type: 'goal', playerName: 'Alex' },
      ]
    })

    afterEach(() => {
      events = []
    })

    it('should keep tournament statistics independent', () => {
      expect(calculatePlayerStatistics('women', events)[0].teamId).toBe('b')
    })
  })
})
