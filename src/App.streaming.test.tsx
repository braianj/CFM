import { act, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { Match, MatchEvent, MatchRosterEntry, Player, Team } from './types/tournament'

interface Emitters {
  onMatches: (matches: Match[]) => void
  onTeams: (teams: Team[]) => void
  onPlayers: (players: Player[]) => void
  onRosters: (rosters: MatchRosterEntry[]) => void
  onEvents: (events: MatchEvent[]) => void
}

let emit: Emitters

vi.mock('./data/firestore', () => ({
  subscribeToTournamentData: (
    onMatches: Emitters['onMatches'],
    onTeams: Emitters['onTeams'],
    onPlayers: Emitters['onPlayers'],
    onRosters: Emitters['onRosters'],
    onEvents: Emitters['onEvents'],
  ) => {
    emit = { onMatches, onTeams, onPlayers, onRosters, onEvents }
    return () => {}
  },
}))

const { default: App } = await import('./App')
const { players: officialPlayers } = await import('./data/players')
const { teams: officialTeams } = await import('./data/teams')
const { matches: officialMatches } = await import('./data/matches')

const CAU_BLANCO_GK = 'Marcelo Zayas'

const openRosters = () => {
  render(<App />)
  fireEvent.click(screen.getByRole('button', { name: 'Planteles' }))
}

describe('rosters while Firestore streams in', () => {
  beforeEach(() => localStorage.clear())
  afterEach(() => localStorage.clear())

  describe('when only part of the published squads has arrived', () => {
    it('should keep showing the players that are still on their way', () => {
      openRosters()
      act(() => { emit.onTeams(officialTeams); emit.onMatches(officialMatches) })

      // Every squad except CAU lands first.
      act(() => { emit.onPlayers(officialPlayers.filter((player) => !player.teamId.includes('cau'))) })

      expect(screen.getByText(CAU_BLANCO_GK)).toBeInTheDocument()
    })

    it('should still show them once the rest arrives', () => {
      openRosters()
      act(() => { emit.onPlayers(officialPlayers.filter((player) => !player.teamId.includes('cau'))) })

      act(() => { emit.onPlayers(officialPlayers) })

      expect(screen.getByText(CAU_BLANCO_GK)).toBeInTheDocument()
    })
  })

  describe('when a published document renames a player', () => {
    it('should show the published name', () => {
      openRosters()

      act(() => {
        emit.onPlayers([{ ...officialPlayers[0], name: 'Nombre Corregido' }])
      })

      expect(screen.getByText('Nombre Corregido')).toBeInTheDocument()
      expect(screen.queryByText(officialPlayers[0].name)).toBeNull()
    })
  })

  describe('when the panel deactivates a player', () => {
    it('should hide them from the public squad', () => {
      openRosters()
      expect(screen.getByText(CAU_BLANCO_GK)).toBeInTheDocument()

      const deactivated = officialPlayers
        .filter((player) => player.name === CAU_BLANCO_GK)
        .map((player) => ({ ...player, active: false }))
      act(() => { emit.onPlayers(deactivated) })

      expect(screen.queryByText(CAU_BLANCO_GK)).toBeNull()
    })
  })
})

describe('statistics filtered by team', () => {
  beforeEach(() => localStorage.clear())
  afterEach(() => localStorage.clear())

  const goal = (id: string, teamId: string, playerName: string): MatchEvent => ({
    id, matchId: 'h-1', category: 'men', teamId, type: 'goal', playerName, period: 1, gameTime: '5:00',
  })

  const openStatistics = () => {
    render(<App />)
    act(() => {
      emit.onTeams(officialTeams)
      emit.onMatches(officialMatches)
      emit.onPlayers(officialPlayers)
      emit.onEvents([
        goal('e1', 'men-cau-2', 'Del Verde'),
        goal('e2', 'men-cau-1', 'Del Blanco'),
        goal('e3', 'women-cau-kipas', 'De Kipas'),
      ])
    })
    fireEvent.click(screen.getByRole('button', { name: 'Estadísticas' }))
  }

  describe('when no team is chosen', () => {
    it('should show both tournaments', () => {
      openStatistics()

      // Cada nombre figura dos veces: en la tabla de puntos y en la planilla completa.
      expect(screen.getAllByText('Del Verde')).toHaveLength(2)
      expect(screen.getAllByText('De Kipas')).toHaveLength(2)
    })
  })

  describe('when a team is chosen', () => {
    it('should keep only that team', () => {
      openStatistics()

      fireEvent.change(screen.getByLabelText('Equipo'), { target: { value: 'men-cau-2' } })

      expect(screen.getAllByText('Del Verde')).toHaveLength(2)
      expect(screen.queryAllByText('Del Blanco')).toHaveLength(0)
    })

    it('should drop the other tournament', () => {
      openStatistics()

      fireEvent.change(screen.getByLabelText('Equipo'), { target: { value: 'men-cau-2' } })

      expect(screen.queryAllByText('De Kipas')).toHaveLength(0)
      expect(screen.queryByText('Torneo Femenino')).toBeNull()
    })
  })
})
