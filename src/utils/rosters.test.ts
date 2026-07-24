import { describe, expect, it } from 'vitest'
import type { Player } from '../types/tournament'
import { mergeRosters } from './rosters'

const player = (id: string, overrides: Partial<Player> = {}): Player => ({
  id,
  category: 'men',
  teamId: 'men-cau-1',
  name: id,
  active: true,
  ...overrides,
})

describe('mergeRosters', () => {
  const official = [player('uno'), player('dos'), player('tres')]

  describe('when nothing is published yet', () => {
    it('should keep the whole versioned squad', () => {
      expect(mergeRosters(official, []).map((item) => item.id)).toEqual(['uno', 'dos', 'tres'])
    })
  })

  describe('when the published documents are still arriving', () => {
    it('should never drop the squad members that have not arrived', () => {
      const merged = mergeRosters(official, [player('dos', { name: 'Dos publicado' })])

      expect(merged.map((item) => item.id)).toEqual(['uno', 'dos', 'tres'])
      expect(merged.find((item) => item.id === 'dos')?.name).toBe('Dos publicado')
    })
  })

  describe('when a published document changes a player', () => {
    it('should prefer the published version', () => {
      const merged = mergeRosters(official, [player('uno', { name: 'Renombrado', role: 'GK' })])

      expect(merged.find((item) => item.id === 'uno')).toMatchObject({ name: 'Renombrado', role: 'GK' })
    })

    it('should carry a deactivation through', () => {
      const merged = mergeRosters(official, [player('uno', { active: false })])

      expect(merged.find((item) => item.id === 'uno')?.active).toBe(false)
    })
  })

  describe('when a club registers a player from the panel', () => {
    it('should append the new player after the versioned squad', () => {
      const merged = mergeRosters(official, [player('cuatro')])

      expect(merged.map((item) => item.id)).toEqual(['uno', 'dos', 'tres', 'cuatro'])
    })
  })
})
