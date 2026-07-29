import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { Match, MatchEvent, MatchRosterEntry, Player } from '../types/tournament'
import { matches as officialMatches } from '../data/matches'
import { teams as officialTeams } from '../data/teams'
import { TIMEZONE } from '../data/tournamentConfig'
import { formatShortDay, formatTime } from '../utils/date'

const saveMatch = vi.fn()
const saveMatchEvent = vi.fn()
const settledMatchIds: string[] = []

// H-1 is CAU Verde against CAU Blanco.
const scorer: Player = { id: 'jugador-1', category: 'men', teamId: 'men-cau-2', name: 'Joaquín Cuitiño', active: true }
const rosterEntry: MatchRosterEntry = {
  id: 'h-1_jugador-1', matchId: 'h-1', category: 'men', teamId: 'men-cau-2',
  playerId: scorer.id, playerName: scorer.name, jerseyNumber: 6,
}
const publishedEvent: MatchEvent = {
  id: 'evento-1', matchId: 'h-1', category: 'men', teamId: 'men-cau-2', type: 'goal',
  playerId: scorer.id, playerName: scorer.name, jerseyNumber: 6, period: 1, gameTime: '2:43',
}

vi.mock('../analytics', () => ({ track: vi.fn(), initAnalytics: () => Promise.resolve() }))

vi.mock('../firebase', () => ({
  auth: {},
  db: {},
  googleProvider: {},
  OWNER_EMAIL: 'braianj@gmail.com',
  MEASUREMENT_ID: '',
}))

vi.mock('firebase/auth', () => ({
  onAuthStateChanged: (_auth: unknown, next: (user: unknown) => void) => {
    next({ email: 'braianj@gmail.com' })
    return () => {}
  },
  signInWithPopup: vi.fn(),
  signOut: vi.fn(),
  GoogleAuthProvider: class {},
}))

vi.mock('../data/firestore', () => ({
  subscribeToTournamentData: (
    onMatches: (matches: Match[]) => void,
    onTeams: (teams: unknown[]) => void,
    onPlayers: (players: unknown[]) => void,
    onRosters: (rosters: unknown[]) => void,
    onEvents: (events: unknown[]) => void,
  ) => {
    // Firestore returns documents ordered by ID, which is not chronological.
    onMatches([...officialMatches]
      .map((item) => (settledMatchIds.includes(item.id)
        ? { ...item, homeScore: 4, awayScore: 1, status: 'finished' as const }
        : item))
      .sort((a, b) => a.id.localeCompare(b.id)))
    onTeams(officialTeams)
    onPlayers([scorer])
    onRosters([rosterEntry])
    onEvents([publishedEvent])
    return () => {}
  },
  getAdminRole: () => Promise.resolve('owner'),
  subscribeToAdmins: () => () => {},
  publishOfficialFixture: vi.fn(),
  saveAdmin: vi.fn(),
  removeAdmin: vi.fn(),
  saveMatch,
  saveTeam: vi.fn(),
  savePlayer: vi.fn(),
  saveMatchEvent,
  removeMatchEvent: vi.fn(),
  saveMatchRosterEntry: vi.fn(),
  removeMatchRosterEntry: vi.fn(),
}))

const { AdminApp } = await import('./AdminApp')

const chronological = [...officialMatches].sort(
  (a, b) => new Date(a.startDateTime).getTime() - new Date(b.startDateTime).getTime(),
)

const whenItStarts = (startDateTime: string) =>
  `${formatShortDay(startDateTime, TIMEZONE)} · ${formatTime(startDateTime, TIMEZONE)}`

// Read in DOM order so the assertion is about the list, not about which rows are open.
const matchHeaders = () => Array.from(document.querySelectorAll('[aria-controls^="match-"]'))

const listedStartTimes = () => matchHeaders().map((header) => header.textContent ?? '')

describe('AdminApp', () => {
  beforeEach(() => {
    localStorage.clear()
    settledMatchIds.length = 0
    saveMatch.mockReset()
    saveMatch.mockResolvedValue(undefined)
    saveMatchEvent.mockReset()
    saveMatchEvent.mockResolvedValue(undefined)
  })

  describe('when Firestore returns the matches by document ID', () => {
    it('should list them by date and time instead', async () => {
      render(<AdminApp />)
      await waitFor(() => expect(screen.getByRole('heading', { name: 'Partidos' })).toBeInTheDocument())

      const shown = listedStartTimes()

      expect(shown).toHaveLength(officialMatches.length)
      shown.forEach((text, index) => {
        expect(text).toContain(whenItStarts(chronological[index].startDateTime))
      })
    })

    it('should offer the statistics match selector in the same order', async () => {
      render(<AdminApp />)
      await waitFor(() => expect(screen.getByRole('heading', { name: 'Partidos' })).toBeInTheDocument())

      screen.getByRole('button', { name: 'Estadísticas' }).click()

      await waitFor(() => {
        const options = screen
          .getAllByRole('option')
          .filter((option) => (option as HTMLOptionElement).value.startsWith('d-') || (option as HTMLOptionElement).value.startsWith('h-'))
        expect(options).toHaveLength(officialMatches.length)
        expect(options[0].textContent).toContain(whenItStarts(chronological[0].startDateTime))
        expect(options.at(-1)!.textContent).toContain(whenItStarts(chronological.at(-1)!.startDateTime))
      })
    })
  })

  describe('when the owner reschedules a match', () => {
    it('should keep the kick-off on Ushuaia time', async () => {
      render(<AdminApp />)
      await waitFor(() => expect(screen.getByRole('heading', { name: 'Partidos' })).toBeInTheDocument())

      const row = screen.getByText(/All-Pakas vs Ovejas Negras/).closest('form')!
      fireEvent.change(row.querySelector('input[type="time"]')!, { target: { value: '19:15' } })
      fireEvent.submit(row)

      await waitFor(() => expect(saveMatch).toHaveBeenCalled())
      const scheduled = officialMatches.find((item) => item.id === 'h-3')!
      expect(saveMatch.mock.calls[0][0]).toMatchObject({
        id: 'h-3',
        startDateTime: `${scheduled.startDateTime.slice(0, 10)}T19:15:00-03:00`,
      })
    })

    it('should leave the kick-off alone when only the score changes', async () => {
      render(<AdminApp />)
      await waitFor(() => expect(screen.getByRole('heading', { name: 'Partidos' })).toBeInTheDocument())

      const row = screen.getByText(/All-Pakas vs Ovejas Negras/).closest('form')!
      fireEvent.submit(row)

      await waitFor(() => expect(saveMatch).toHaveBeenCalled())
      const scheduled = officialMatches.find((item) => item.id === 'h-3')!
      expect(saveMatch.mock.calls[0][0].startDateTime).toBe(scheduled.startDateTime)
    })
  })

  describe('when an event was read wrong from the scoresheet', () => {
    const openTheEvent = async () => {
      render(<AdminApp />)
      await waitFor(() => expect(screen.getByRole('heading', { name: 'Partidos' })).toBeInTheDocument())
      screen.getByRole('button', { name: 'Estadísticas' }).click()
      const selector = await screen.findByLabelText('Partido')
      fireEvent.change(selector, { target: { value: 'h-1' } })
      fireEvent.click(await screen.findByRole('button', { name: 'Editar' }))
    }

    it('should load it back into the form', async () => {
      await openTheEvent()

      // The call-up form has its own player selector, so read the event form's own.
      const form = within(screen.getByRole('button', { name: 'Guardar corrección' }).closest('form')!)

      expect(form.getByLabelText('Tiempo de juego')).toHaveValue('2:43')
      expect(form.getByLabelText('Jugador/a')).toHaveValue(scorer.id)
      expect(form.getByLabelText('Equipo')).toHaveValue('men-cau-2')
    })

    it('should replace the event instead of publishing a second one', async () => {
      await openTheEvent()

      const form = screen.getByRole('button', { name: 'Guardar corrección' }).closest('form')!
      fireEvent.change(within(form).getByLabelText('Tiempo de juego'), { target: { value: '2:34' } })
      fireEvent.submit(form)

      await waitFor(() => expect(saveMatchEvent).toHaveBeenCalled())
      expect(saveMatchEvent.mock.calls[0][0]).toMatchObject({ id: publishedEvent.id, gameTime: '2:34' })
    })

    it('should stop editing once the correction is saved', async () => {
      await openTheEvent()

      fireEvent.submit(screen.getByRole('button', { name: 'Guardar corrección' }).closest('form')!)

      await waitFor(() => expect(screen.getByRole('button', { name: 'Publicar evento' })).toBeInTheDocument())
    })
  })

  describe('when a match already has its result saved', () => {
    beforeEach(() => settledMatchIds.push('h-1'))

    it('should collapse it and leave the rest open', async () => {
      render(<AdminApp />)
      await waitFor(() => expect(screen.getByRole('heading', { name: 'Partidos' })).toBeInTheDocument())

      const collapsed = matchHeaders().filter((header) => header.getAttribute('aria-expanded') === 'false')

      expect(collapsed).toHaveLength(1)
      expect(collapsed[0].getAttribute('aria-controls')).toBe('match-h-1-editor')
    })

    it('should still show the teams, the date and the result while collapsed', async () => {
      render(<AdminApp />)
      await waitFor(() => expect(screen.getByRole('heading', { name: 'Partidos' })).toBeInTheDocument())

      const header = matchHeaders().find((item) => item.getAttribute('aria-controls') === 'match-h-1-editor')!

      expect(header.textContent).toContain('CAU Verde vs CAU Blanco')
      expect(header.textContent).toContain('21:30')
      expect(header.textContent).toContain('4')
      expect(header.textContent).toContain('1')
    })

    it('should hide the editor until it is expanded', async () => {
      render(<AdminApp />)
      await waitFor(() => expect(screen.getByRole('heading', { name: 'Partidos' })).toBeInTheDocument())

      const header = matchHeaders().find((item) => item.getAttribute('aria-controls') === 'match-h-1-editor')!
      expect(document.getElementById('match-h-1-editor')).toHaveAttribute('hidden')

      fireEvent.click(header)

      expect(header).toHaveAttribute('aria-expanded', 'true')
      expect(document.getElementById('match-h-1-editor')).not.toHaveAttribute('hidden')
    })
  })
})
