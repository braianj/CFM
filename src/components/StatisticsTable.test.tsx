import { render, screen, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import type { PlayerStatistic, Team } from '../types/tournament'
import { StatisticsTable } from './StatisticsTable'

const teams: Team[] = [
  { id: 'men-cau-3', name: 'CAU Negro', category: 'men', shortName: 'Negro' },
]

const row = (playerName: string, overrides: Partial<PlayerStatistic> = {}): PlayerStatistic => ({
  playerName,
  teamId: 'men-cau-3',
  played: 1,
  goals: 0,
  assists: 0,
  points: 0,
  penalties: 0,
  majorPenalties: 0,
  penaltyMinutes: 0,
  ...overrides,
})

const leaderboard = () => within(screen.getByRole('list')).getAllByRole('listitem').map((item) => item.textContent ?? '')

describe('StatisticsTable', () => {
  describe('when players have scored', () => {
    it('should spell out goals and assists instead of only a total', () => {
      render(<StatisticsTable rows={[row('Martin Baeza', { goals: 4, assists: 1, points: 5 })]} teams={teams} />)

      expect(leaderboard()[0]).toContain('4 goles')
      expect(leaderboard()[0]).toContain('1 asistencia')
    })

    it('should use the singular for a single goal', () => {
      render(<StatisticsTable rows={[row('Martin Baeza', { goals: 1, points: 1 })]} teams={teams} />)

      expect(leaderboard()[0]).toContain('1 gol')
      expect(leaderboard()[0]).not.toContain('goles')
    })

    it('should give tied players the same position', () => {
      render(<StatisticsTable rows={[
        row('Uno', { goals: 3, points: 3 }),
        row('Dos', { goals: 3, points: 3 }),
        row('Tres', { goals: 1, points: 1 }),
      ]} teams={teams} />)

      const shown = leaderboard()
      expect(shown[0]).toMatch(/^1/)
      expect(shown[1]).toMatch(/^1/)
      expect(shown[2]).toMatch(/^3/)
    })
  })

  describe('when a player dressed but did not score', () => {
    it('should keep them out of the leaderboard', () => {
      render(<StatisticsTable rows={[row('Con puntos', { goals: 1, points: 1 }), row('Sin puntos')]} teams={teams} />)

      expect(leaderboard()).toHaveLength(1)
    })

    it('should keep them out of the full sheet too, and only count them', () => {
      render(<StatisticsTable rows={[row('Con puntos', { goals: 1, points: 1 }), row('Sin puntos')]} teams={teams} />)

      expect(screen.getByText('Ver goles, faltas y minutos · 1 jugadores')).toBeInTheDocument()
      expect(screen.queryByText('Sin puntos')).toBeNull()
      expect(screen.getByText(/Otro jugador estuvo convocado/)).toBeInTheDocument()
    })

    it('should count several of them in the plural', () => {
      render(<StatisticsTable rows={[
        row('Con puntos', { goals: 1, points: 1 }),
        row('Sin puntos'),
        row('Tampoco'),
      ]} teams={teams} />)

      expect(screen.getByText(/Otros 2 jugadores estuvieron convocados/)).toBeInTheDocument()
    })
  })

  describe('when a player was only penalised', () => {
    it('should list them in the sheet even though they have no points', () => {
      render(<StatisticsTable rows={[row('Solo faltas', { penalties: 1, penaltyMinutes: 2 })]} teams={teams} />)

      expect(screen.getByText('Solo faltas')).toBeInTheDocument()
      expect(screen.queryByRole('list')).not.toBeInTheDocument()
    })
  })

  describe('when everybody only dressed', () => {
    it('should say there is nothing yet instead of listing the squads', () => {
      render(<StatisticsTable rows={[row('Uno'), row('Dos')]} teams={teams} />)

      expect(screen.getByText(/se publicarán cuando estén disponibles/)).toBeInTheDocument()
      expect(screen.queryByText('Uno')).toBeNull()
    })
  })

  describe('when there are no statistics at all', () => {
    it('should say so instead of showing an empty table', () => {
      render(<StatisticsTable rows={[]} teams={teams} />)

      expect(screen.getByText(/se publicarán cuando estén disponibles/)).toBeInTheDocument()
    })
  })
})
