import { beforeEach, describe, expect, it } from 'vitest'
import type { Team } from '../types/tournament'
import { getTeamsByCategory } from './teams'

describe('getTeamsByCategory', () => {
  describe('when selecting the men’s tournament', () => {
    let menTeams: Team[]

    beforeEach(() => {
      menTeams = getTeamsByCategory('men')
    })

    it('should return the six exact team names', () => {
      expect(menTeams.map((team) => team.name)).toEqual([
        'CAU Blanco',
        'CAU Verde',
        'CAU Negro',
        'Ñires',
        'All-Pakas',
        'Ovejas Negras',
      ])
    })

    it('should represent the three CAU teams with independent IDs', () => {
      const cauIds = menTeams
        .filter((team) => team.name.startsWith('CAU '))
        .map((team) => team.id)

      expect(new Set(cauIds).size).toBe(3)
    })

    it('should not field a men’s ACEMHH team', () => {
      expect(menTeams.some((team) => team.name.includes('ACEMHH'))).toBe(false)
    })
  })

  describe('when selecting the women’s tournament', () => {
    let womenTeams: Team[]

    beforeEach(() => {
      womenTeams = getTeamsByCategory('women')
    })

    it('should return the five exact team names', () => {
      expect(womenTeams.map((team) => team.name)).toEqual([
        'CAU Kipas',
        'All-Pakas Damas',
        'Ovejas Negras Damas',
        'ACEMHH Damas',
        'Ñires Zorras',
      ])
    })
  })
})
