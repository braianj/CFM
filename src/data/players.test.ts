import { describe, expect, it } from 'vitest'
import { getPlayersByTeam, players } from './players'
import { teams } from './teams'

describe('official rosters', () => {
  describe('when checking player identity', () => {
    it('should keep every player ID unique', () => {
      expect(new Set(players.map((player) => player.id)).size).toBe(players.length)
    })

    it('should reference a registered team', () => {
      const teamIds = new Set(teams.map((team) => team.id))

      players.forEach((player) => expect(teamIds.has(player.teamId)).toBe(true))
    })

    it('should match the category of its team', () => {
      const categoryById = new Map(teams.map((team) => [team.id, team.category]))

      players.forEach((player) => expect(player.category).toBe(categoryById.get(player.teamId)))
    })

    it('should never repeat a name inside a team', () => {
      teams.forEach((team) => {
        const names = getPlayersByTeam(team.id).map((player) => player.name)

        expect(new Set(names).size).toBe(names.length)
      })
    })
  })

  describe('when checking privacy', () => {
    it('should store only the fields the site needs', () => {
      players.forEach((player) => {
        expect(Object.keys(player).sort()).toEqual(['active', 'category', 'id', 'name', 'teamId'])
      })
    })
  })

  describe('when checking the submitted rosters', () => {
    it.each([
      ['men-los-nires', 16],
      ['men-allpacas', 14],
      ['women-allpacas', 9],
      ['women-los-nires-zorras', 10],
      ['women-acemhh', 8],
    ])('should hold the %s roster with %i players', (teamId, expected) => {
      expect(getPlayersByTeam(teamId)).toHaveLength(expected)
    })
  })
})
