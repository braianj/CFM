import { render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { Match } from '../types/tournament'
import { matches as officialMatches } from '../data/matches'
import { teams as officialTeams } from '../data/teams'
import { TIMEZONE } from '../data/tournamentConfig'
import { formatDay, formatTime } from '../utils/date'

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
    onMatches([...officialMatches].sort((a, b) => a.id.localeCompare(b.id)))
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
  saveMatch: vi.fn(),
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

const listedStartTimes = () =>
  screen.getAllByRole('button', { name: /^Guardar resultado$/ }).map((button) => {
    const header = button.closest('form')!.querySelector('span')!
    return header.textContent ?? ''
  })

describe('AdminApp', () => {
  beforeEach(() => localStorage.clear())

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
})
