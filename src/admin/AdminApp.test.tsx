import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { Match } from '../types/tournament'
import { matches as officialMatches } from '../data/matches'
import { teams as officialTeams } from '../data/teams'
import { TIMEZONE } from '../data/tournamentConfig'
import { formatDay, formatTime } from '../utils/date'

const saveMatch = vi.fn()
const settledMatchIds: string[] = []

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
    onPlayers([])
    onRosters([])
    onEvents([])
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
  saveMatchEvent: vi.fn(),
  removeMatchEvent: vi.fn(),
  saveMatchRosterEntry: vi.fn(),
  removeMatchRosterEntry: vi.fn(),
}))

const { AdminApp } = await import('./AdminApp')

const chronological = [...officialMatches].sort(
  (a, b) => new Date(a.startDateTime).getTime() - new Date(b.startDateTime).getTime(),
)

const whenItStarts = (startDateTime: string) =>
  `${formatDay(startDateTime, TIMEZONE)} · ${formatTime(startDateTime, TIMEZONE)}`

// Read in DOM order so the assertion is about the list, not about which rows are open.
const matchHeaders = () => Array.from(document.querySelectorAll('[aria-controls^="match-"]'))

const listedStartTimes = () => matchHeaders().map((header) => header.textContent ?? '')

describe('AdminApp', () => {
  beforeEach(() => {
    localStorage.clear()
    settledMatchIds.length = 0
    saveMatch.mockReset()
    saveMatch.mockResolvedValue(undefined)
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
