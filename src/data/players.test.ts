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
    const allowedFields = ['active', 'category', 'id', 'name', 'role', 'teamId']

    it('should never store a field beyond what the site needs', () => {
      players.forEach((player) => {
        Object.keys(player).forEach((field) => expect(allowedFields).toContain(field))
      })
    })

    it('should store no identity document and no birth date', () => {
      const serialized = JSON.stringify(players)

      expect(serialized).not.toMatch(/\d{7}/)
      expect(serialized).not.toMatch(/dni|pasaporte|nacimiento/i)
    })
  })

  describe('when checking the submitted rosters', () => {
    it('should cover every registered team', () => {
      teams.forEach((team) => expect(getPlayersByTeam(team.id).length).toBeGreaterThan(0))
    })

    it.each([
      ['men-cau-1', 14],
      ['men-cau-2', 16],
      ['men-cau-3', 13],
      ['men-los-nires', 16],
      ['men-allpacas', 14],
      ['men-ovejas-negras', 13],
      ['women-cau-kipas', 15],
      ['women-allpacas', 9],
      ['women-ovejas-negras', 11],
      ['women-acemhh', 8],
      ['women-los-nires-zorras', 10],
    ])('should hold the %s roster with %i players', (teamId, expected) => {
      expect(getPlayersByTeam(teamId)).toHaveLength(expected)
    })

    it('should give every team at least one goalkeeper', () => {
      teams.forEach((team) => {
        expect(getPlayersByTeam(team.id).some((player) => player.role === 'GK')).toBe(true)
      })
    })
  })
})
