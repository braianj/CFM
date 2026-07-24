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
