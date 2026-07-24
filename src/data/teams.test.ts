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
        'ACEMHH',
        'Alpacas',
        'LOS ÑIRES',
      ])
    })

    it('should represent the three CAU teams with independent IDs', () => {
      const cauIds = menTeams
        .filter((team) => team.name.startsWith('CAU '))
        .map((team) => team.id)

      expect(new Set(cauIds).size).toBe(3)
    })
  })
})
