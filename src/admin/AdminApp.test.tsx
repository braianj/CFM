import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { Match, MatchEvent, MatchRosterEntry, Player } from '../types/tournament'
import { matches as officialMatches } from '../data/matches'
import { teams as officialTeams } from '../data/teams'
import { TIMEZONE } from '../data/tournamentConfig'
import { formatShortDay, formatTime } from '../utils/date'

const saveMatch = vi.fn()
const saveMatchEvent = vi.fn()
const saveMatchRosterEntry = vi.fn()
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
  saveMatchRosterEntry,
  removeMatchRosterEntry: vi.fn(),
}))

const { AdminApp } = await import('./AdminApp')

const chronological = [...officialMatches].sort(
  (a, b) => new Date(a.startDateTime).getTime() - new Date(b.startDateTime).getTime(),
)

const whenItStarts = (startDateTime: string) =>
  `${formatShortDay(startDateTime, TIMEZONE)} · ${formatTime(startDateTime, TIMEZONE)}`

// Read in DOM order so the assertion is about the list itself.
const matchRows = () => Array.from(document.querySelectorAll('[id^="match-"]'))

const listedStartTimes = () => matchRows().map((row) => row.textContent ?? '')

const showTheList = async () => {
  render(<AdminApp />)
  await waitFor(() => expect(screen.getByRole('heading', { name: 'Partidos' })).toBeInTheDocument())
}

// The panel is one match at a time, so every test that loads anything opens one first.
const openMatch = async (matchId: string) => {
  await showTheList()
  fireEvent.click(document.getElementById(`match-${matchId}`)!)
  await waitFor(() => expect(screen.getByRole('heading', { name: /Qué pasó/ })).toBeInTheDocument())
}

// Steps 2 and 3 start folded, so anything inside them has to be revealed first.
const openStep = (title: RegExp) =>
  fireEvent.click(within(screen.getByRole('heading', { name: title })).getByRole('button'))

describe('AdminApp', () => {
  beforeEach(() => {
    localStorage.clear()
    settledMatchIds.length = 0
    saveMatch.mockReset()
    saveMatch.mockResolvedValue(undefined)
    saveMatchEvent.mockReset()
    saveMatchEvent.mockResolvedValue(undefined)
    saveMatchRosterEntry.mockReset()
    saveMatchRosterEntry.mockResolvedValue(undefined)
  })

  describe('when Firestore returns the matches by document ID', () => {
    it('should list them by date and time instead', async () => {
      await showTheList()

      const shown = listedStartTimes()

      expect(shown).toHaveLength(officialMatches.length)
      shown.forEach((text, index) => {
        expect(text).toContain(whenItStarts(chronological[index].startDateTime))
      })
    })
  })

  describe('when the operator is looking for the match on their paper sheet', () => {
    it('should show the code the scoresheet prints', async () => {
      await showTheList()

      expect(document.getElementById('match-h-1')!.textContent).toContain('H-1')
      expect(document.getElementById('match-d-3')!.textContent).toContain('D-3')
    })

    it('should say what each match still needs', async () => {
      settledMatchIds.push('h-2')
      await showTheList()

      expect(document.getElementById('match-h-3')!.textContent).toContain('falta el resultado')
      expect(document.getElementById('match-h-2')!.textContent).not.toContain('falta el resultado')
    })

    it('should open the match it was told to open', async () => {
      await openMatch('h-1')

      expect(screen.getByRole('heading', { name: 'CAU Verde vs CAU Blanco' })).toBeInTheDocument()
      expect(screen.getByRole('heading', { name: /El resultado/ })).toBeInTheDocument()
      expect(screen.getByRole('heading', { name: /Quiénes jugaron/ })).toBeInTheDocument()
    })
  })

  describe('when a match is opened', () => {
    it('should fold the two long steps and leave the result open', async () => {
      await openMatch('h-1')

      // The result is short and is what gets loaded first, so it stays open.
      expect(screen.getByRole('button', { name: 'Guardar' })).toBeInTheDocument()
      expect(document.getElementById('step-2')).toHaveAttribute('hidden')
      expect(document.getElementById('step-3')).toHaveAttribute('hidden')
    })

    it('should say what is inside a folded step without opening it', async () => {
      await openMatch('h-1')

      expect(screen.getByRole('heading', { name: /Quiénes jugaron/ }).textContent).toContain('1 anotados')
      expect(screen.getByRole('heading', { name: /Qué pasó/ }).textContent).toContain('1 cargados')
    })

    it('should unfold a step when its heading is used', async () => {
      await openMatch('h-1')

      openStep(/Qué pasó/)

      expect(document.getElementById('step-3')).not.toHaveAttribute('hidden')
      expect(screen.getByRole('button', { name: 'Editar' })).toBeInTheDocument()
    })

    it('should leave the step open after a trip to the editor', async () => {
      await openMatch('h-1')
      openStep(/Qué pasó/)
      fireEvent.click(screen.getByRole('button', { name: 'Editar' }))

      fireEvent.click(screen.getByRole('button', { name: '‹ Volver al partido' }))

      expect(document.getElementById('step-3')).not.toHaveAttribute('hidden')
    })
  })

  describe('when the owner reschedules a match', () => {
    it('should keep the kick-off on Ushuaia time', async () => {
      await openMatch('h-3')

      const row = screen.getByRole('button', { name: 'Guardar' }).closest('form')!
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
      await openMatch('h-3')

      fireEvent.submit(screen.getByRole('button', { name: 'Guardar' }).closest('form')!)

      await waitFor(() => expect(saveMatch).toHaveBeenCalled())
      const scheduled = officialMatches.find((item) => item.id === 'h-3')!
      expect(saveMatch.mock.calls[0][0].startDateTime).toBe(scheduled.startDateTime)
    })
  })

  describe('when the goalkeeper line is loaded', () => {
    const openTheStep = async () => {
      await openMatch('h-1')
      openStep(/Los arqueros/)
    }

    it('should offer the players already called up for this match', async () => {
      await openTheStep()

      expect(screen.getByLabelText('Arquero/a')).toBeInTheDocument()
      expect(screen.getByRole('option', { name: `#6 · ${scorer.name} · CAU Verde` })).toBeInTheDocument()
    })

    it('should save the minutes, the saves and the goals against on the call-up', async () => {
      await openTheStep()

      fireEvent.change(screen.getByLabelText('Arquero/a'), { target: { value: scorer.id } })
      fireEvent.change(screen.getByLabelText('Minutos jugados'), { target: { value: '30' } })
      fireEvent.change(screen.getByLabelText('Atajadas'), { target: { value: '17' } })
      fireEvent.change(screen.getByLabelText('Goles recibidos'), { target: { value: '3' } })
      fireEvent.submit(screen.getByRole('button', { name: 'Guardar el arquero' }).closest('form')!)

      await waitFor(() => expect(saveMatchRosterEntry).toHaveBeenCalled())
      expect(saveMatchRosterEntry.mock.calls[0][0]).toMatchObject({
        id: rosterEntry.id, playerId: scorer.id, minutesPlayed: 30, saves: 17, goalsAgainst: 3,
      })
    })

    it('should leave a field the scoresheet did not fill in empty', async () => {
      await openTheStep()

      fireEvent.change(screen.getByLabelText('Arquero/a'), { target: { value: scorer.id } })
      fireEvent.change(screen.getByLabelText('Atajadas'), { target: { value: '17' } })
      fireEvent.submit(screen.getByRole('button', { name: 'Guardar el arquero' }).closest('form')!)

      await waitFor(() => expect(saveMatchRosterEntry).toHaveBeenCalled())
      expect(saveMatchRosterEntry.mock.calls[0][0].minutesPlayed).toBeUndefined()
      expect(saveMatchRosterEntry.mock.calls[0][0].goalsAgainst).toBeUndefined()
    })
  })

  describe('when an event was read wrong from the scoresheet', () => {
    const openTheEvent = async () => {
      await openMatch('h-1')
      openStep(/Qué pasó/)
      fireEvent.click(screen.getByRole('button', { name: 'Editar' }))
    }

    it('should open the editor on its own screen', async () => {
      await openTheEvent()

      expect(screen.getByRole('heading', { name: 'Corregir el evento' })).toBeInTheDocument()
      // The three steps are gone: one thing on screen at a time.
      expect(screen.queryByRole('heading', { name: /Qué pasó/ })).toBeNull()
      expect(screen.getByRole('button', { name: '‹ Volver al partido' })).toBeInTheDocument()
    })

    it('should load it back into the form', async () => {
      await openTheEvent()

      // The call-up form has its own player selector, so read the event form's own.
      const form = within(screen.getByRole('button', { name: 'Guardar corrección' }).closest('form')!)

      expect(form.getByLabelText('Reloj restante')).toHaveValue('2:43')
      expect(form.getByLabelText('Jugador/a')).toHaveValue(scorer.id)
      expect(form.getByLabelText('Equipo')).toHaveValue('men-cau-2')
    })

    it('should replace the event instead of publishing a second one', async () => {
      await openTheEvent()

      const form = screen.getByRole('button', { name: 'Guardar corrección' }).closest('form')!
      fireEvent.change(within(form).getByLabelText('Reloj restante'), { target: { value: '2:34' } })
      fireEvent.submit(form)

      await waitFor(() => expect(saveMatchEvent).toHaveBeenCalled())
      expect(saveMatchEvent.mock.calls[0][0]).toMatchObject({ id: publishedEvent.id, gameTime: '2:34' })
    })

    it('should go back to the match once the correction is saved', async () => {
      await openTheEvent()

      fireEvent.submit(screen.getByRole('button', { name: 'Guardar corrección' }).closest('form')!)

      await waitFor(() => expect(screen.getByRole('heading', { name: /Qué pasó/ })).toBeInTheDocument())
      expect(screen.queryByRole('button', { name: 'Guardar corrección' })).toBeNull()
    })
  })

  describe('when the operator copies an event off the scoresheet', () => {
    const openTheForm = async () => {
      await openMatch('h-1')
      openStep(/Qué pasó/)
      fireEvent.click(screen.getByRole('button', { name: '+ Cargar un gol o una falta' }))
      const form = screen.getByRole('button', { name: 'Cargar el evento' }).closest('form')!
      // The team defaults to whichever of the two comes first in the tournament data.
      fireEvent.change(within(form).getByLabelText('Equipo'), { target: { value: scorer.teamId } })
      return form
    }

    it('should resolve the player from the jersey number alone', async () => {
      const form = await openTheForm()

      fireEvent.change(within(form).getByLabelText('Jugador/a · casaca'), { target: { value: '6' } })

      expect(within(form).getByLabelText('Jugador/a')).toHaveValue(scorer.id)
    })

    it('should save a number nobody claims with the player left blank', async () => {
      const form = await openTheForm()

      fireEvent.change(within(form).getByLabelText('Jugador/a · casaca'), { target: { value: '35' } })
      fireEvent.submit(form)

      await waitFor(() => expect(saveMatchEvent).toHaveBeenCalled())
      expect(saveMatchEvent.mock.calls[0][0]).toMatchObject({ jerseyNumber: 35, playerName: '' })
      expect(saveMatchEvent.mock.calls[0][0].playerId).toBeUndefined()
    })

    it('should keep an unreadable period and clock out of the event', async () => {
      const form = await openTheForm()

      fireEvent.change(within(form).getByLabelText('Jugador/a · casaca'), { target: { value: '6' } })
      fireEvent.submit(form)

      await waitFor(() => expect(saveMatchEvent).toHaveBeenCalled())
      expect(saveMatchEvent.mock.calls[0][0].period).toBeUndefined()
      expect(saveMatchEvent.mock.calls[0][0].gameTime).toBeUndefined()
    })

    it('should refuse an event with neither a number nor a player', async () => {
      const form = await openTheForm()

      fireEvent.submit(form)

      expect(saveMatchEvent).not.toHaveBeenCalled()
    })
  })

})
