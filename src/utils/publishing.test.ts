import { describe, expect, it } from 'vitest'
import type { Match, Player } from '../types/tournament'
import { areOfficialRostersPublished, isOfficialFixturePublished } from './publishing'

const match = (id: string): Match => ({
  id,
  category: 'men',
  startDateTime: '2026-07-25T20:30:00-03:00',
  stage: 'regular',
  homeTeamId: 'a',
  awayTeamId: 'b',
  homeScore: null,
  awayScore: null,
  status: 'upcoming',
  countsForStandings: true,
})

const player = (id: string): Player => ({ id, category: 'men', teamId: 'a', name: id, active: true })

describe('isOfficialFixturePublished', () => {
  const official = [match('h-1'), match('h-2')]

  describe('when the published schedule holds the official matches', () => {
    it('should report the fixture as published', () => {
      expect(isOfficialFixturePublished([...official].reverse(), official)).toBe(true)
    })
  })

  describe('when the published schedule still holds other matches', () => {
    it('should report the fixture as pending', () => {
      expect(isOfficialFixturePublished([match('m-01')], official)).toBe(false)
    })
  })

  describe('when the published schedule keeps leftovers alongside the official matches', () => {
    it('should report the fixture as pending', () => {
      expect(isOfficialFixturePublished([...official, match('m-01')], official)).toBe(false)
    })
  })
})

describe('areOfficialRostersPublished', () => {
  const official = [player('a-uno'), player('a-dos')]

  describe('when every official player is published', () => {
    it('should report the rosters as published', () => {
      expect(areOfficialRostersPublished(official, official)).toBe(true)
    })
  })

  describe('when a club registered extra players from the panel', () => {
    it('should still report the rosters as published', () => {
      expect(areOfficialRostersPublished([...official, player('a-tres')], official)).toBe(true)
    })
  })

  describe('when an official player is missing', () => {
    it('should report the rosters as pending', () => {
      expect(areOfficialRostersPublished([player('a-uno')], official)).toBe(false)
    })
  })
})
