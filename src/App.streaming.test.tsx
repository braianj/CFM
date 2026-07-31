import { act, fireEvent, render, screen, within } from '@testing-library/react'
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
let options: { detail?: boolean } | undefined

vi.mock('./data/firestore', () => ({
  subscribeToTournamentData: (
    onMatches: Emitters['onMatches'],
    onTeams: Emitters['onTeams'],
    onPlayers: Emitters['onPlayers'],
    onRosters: Emitters['onRosters'],
    onEvents: Emitters['onEvents'],
    _onError: () => void,
    subscription: { detail?: boolean } = {},
  ) => {
    emit = { onMatches, onTeams, onPlayers, onRosters, onEvents }
    options = { detail: Boolean(subscription.detail) }
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

describe('what the public site subscribes to', () => {
  beforeEach(() => localStorage.clear())
  afterEach(() => localStorage.clear())

  it('should render the squads without any snapshot at all', () => {
    openRosters()

    // Nothing was emitted: this is the versioned copy that ships in the build.
    expect(screen.getByText(CAU_BLANCO_GK)).toBeInTheDocument()
  })

  it('should ask Firestore only for the matches and the teams', () => {
    render(<App />)

    // The squads, the call-ups and the events are about a thousand documents and
    // Firestore bills one read each on every visit, so the public site never asks for
    // them. Only the panel does, and it passes detail.
    expect(options).toEqual({ detail: false })
  })

  it('should still take the live result of a match', () => {
    render(<App />)
    const played = officialMatches.map((match) =>
      match.id === 'h-1' ? { ...match, homeScore: 9, awayScore: 0, status: 'finished' as const } : match)

    act(() => { emit.onMatches(played) })

    expect(screen.getByText('9')).toBeInTheDocument()
  })
})

describe('a player card', () => {
  beforeEach(() => localStorage.clear())
  afterEach(() => localStorage.clear())

  const scorer = officialPlayers.find((player) => player.name === 'Martin Baeza')!

  const openTheCard = () => {
    render(<App />)
    act(() => {
      emit.onTeams(officialTeams)
      emit.onMatches(officialMatches)
      emit.onPlayers(officialPlayers)
      emit.onRosters([{
        id: 'h-8_baeza', matchId: 'h-8', category: 'men', teamId: scorer.teamId,
        playerId: scorer.id, playerName: scorer.name, jerseyNumber: 92,
      }])
      emit.onEvents([{
        id: 'e1', matchId: 'h-8', category: 'men', teamId: scorer.teamId, type: 'goal',
        playerName: scorer.name, jerseyNumber: 92, period: 1, gameTime: '8:45',
      }])
    })
    fireEvent.click(screen.getByRole('button', { name: 'Planteles' }))
    fireEvent.click(screen.getByRole('button', { name: new RegExp(scorer.name) }))
  }

  it('should open from the squad list', () => {
    openTheCard()

    expect(screen.getByRole('heading', { name: scorer.name })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '‹ Volver al plantel' })).toBeInTheDocument()
  })

  it('should total what the player did', () => {
    openTheCard()

    // "Partidos" is also a view tab, so read the totals list itself.
    const totals = within(document.querySelector('dl')!)
    const total = (label: string) => totals.getByText(label).closest('div')!.textContent
    expect(total('Goles')).toBe('Goles1')
    expect(total('Partidos')).toBe('Partidos1')
    expect(total('Puntos')).toBe('Puntos1')
    expect(total('Faltas')).toBe('Faltas0')
  })

  it('should list the match with the time played and the number used', () => {
    openTheCard()

    expect(screen.getByText(/vs Ovejas Negras/)).toBeInTheDocument()
    expect(screen.getByText(/#92/)).toBeInTheDocument()
    // The sheet says 8:45 left in a fifteen-minute period.
    expect(screen.getByText(/6:15/)).toBeInTheDocument()
  })

  it('should go back to the squad list', () => {
    openTheCard()

    fireEvent.click(screen.getByRole('button', { name: '‹ Volver al plantel' }))

    expect(screen.queryByRole('heading', { name: scorer.name })).toBeNull()
    expect(screen.getByRole('heading', { name: 'CAU Negro' })).toBeInTheDocument()
  })
})

describe('goalkeepers on their own tab', () => {
  beforeEach(() => localStorage.clear())
  afterEach(() => localStorage.clear())

  const openStatistics = () => {
    render(<App />)
    fireEvent.click(screen.getByRole('button', { name: 'Estadísticas' }))
  }

  it('should start on the outfield players', () => {
    openStatistics()

    // Two tournaments, so one skater section each.
    expect(screen.getAllByText('Goles y asistencias')).toHaveLength(2)
    // The tab itself is called Arqueros, so look for the section heading.
    expect(screen.queryByRole('heading', { name: 'Arqueros' })).toBeNull()
  })

  it('should swap the whole section for the goalkeepers', () => {
    openStatistics()

    fireEvent.click(screen.getByRole('button', { name: 'Arqueros' }))

    // Two tournaments, so two goalkeeper tables and no skater table left.
    expect(screen.getAllByRole('heading', { name: 'Arqueros' })).toHaveLength(2)
    expect(screen.queryAllByText('Goles y asistencias')).toHaveLength(0)
  })

  it('should show the saves that ship with the build', () => {
    openStatistics()

    fireEvent.click(screen.getByRole('button', { name: 'Arqueros' }))

    expect(screen.getByText('Joaquin Bernales')).toBeInTheDocument()
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
