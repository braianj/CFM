import { fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import App from './App'

vi.mock('./data/firestore', () => ({ subscribeToTournamentData: () => () => {} }))

const teamFilter = () => screen.getByLabelText('Equipo') as HTMLSelectElement

const selectTeam = (teamId: string) => fireEvent.change(teamFilter(), { target: { value: teamId } })

const selectScope = (label: string) => fireEvent.click(screen.getByRole('button', { name: label }))

const selectView = (label: string) => fireEvent.click(screen.getByRole('button', { name: label }))

const listedMatches = () => screen.getAllByRole('article').length

describe('App', () => {
  beforeEach(() => localStorage.clear())
  afterEach(() => localStorage.clear())

  describe('when the whole tournament is selected', () => {
    it('should list the matches of both categories by default', () => {
      render(<App />)

      expect(listedMatches()).toBe(34)
    })

    it('should tell each match apart by tournament', () => {
      render(<App />)

      expect(screen.getAllByText(/Masculino ·/).length).toBe(19)
      expect(screen.getAllByText(/Femenino ·/).length).toBe(15)
    })

    it('should show a standings table per tournament', () => {
      render(<App />)

      selectView('Posiciones')

      expect(screen.getByText('Torneo Masculino')).toBeInTheDocument()
      expect(screen.getByText('Torneo Femenino')).toBeInTheDocument()
      expect(screen.getAllByRole('table').length).toBe(2)
    })
  })

  describe('when a single tournament is selected', () => {
    it('should list only its matches', () => {
      render(<App />)

      selectScope('Masculino')

      expect(listedMatches()).toBe(19)
    })

    it('should drop the tournament label from every match', () => {
      render(<App />)

      selectScope('Femenino')

      expect(screen.queryByText(/Masculino ·/)).toBeNull()
      expect(listedMatches()).toBe(15)
    })
  })

  describe('when a team is selected', () => {
    it('should list only its matches and the playoffs it could reach', () => {
      render(<App />)

      selectTeam('men-cau-1')

      expect(listedMatches()).toBe(9)
    })

    it('should never mix in the other tournament', () => {
      render(<App />)

      selectTeam('men-cau-1')

      expect(screen.queryByText(/Femenino ·/)).toBeNull()
    })

    it('should remember the selected team across visits', () => {
      const { unmount } = render(<App />)
      selectTeam('men-cau-1')
      unmount()

      render(<App />)

      expect(teamFilter().value).toBe('men-cau-1')
    })
  })

  describe('when looking at the rosters', () => {
    it('should list every team of the selected scope', () => {
      render(<App />)

      selectView('Planteles')

      expect(screen.getByRole('heading', { name: 'Ñires' })).toBeInTheDocument()
      expect(screen.getByRole('heading', { name: 'CAU Kipas' })).toBeInTheDocument()
    })

    it('should show the registered players of a team', () => {
      render(<App />)

      selectView('Planteles')

      expect(screen.getByText('Nicolas Badaracco')).toBeInTheDocument()
      expect(screen.getByText('Milagros Cavalleri')).toBeInTheDocument()
    })

    it('should narrow to a single team when one is selected', () => {
      render(<App />)
      selectView('Planteles')

      selectTeam('men-los-nires')

      expect(screen.getByRole('heading', { name: 'Ñires' })).toBeInTheDocument()
      expect(screen.queryByRole('heading', { name: 'CAU Kipas' })).toBeNull()
    })

    it('should say so when a club has not submitted its roster', () => {
      render(<App />)
      selectView('Planteles')

      selectTeam('men-cau-1')

      expect(screen.getByText('El plantel todavía no fue publicado.')).toBeInTheDocument()
    })
  })

  describe('when the tournament changes', () => {
    it('should clear a filter that belongs to the other category', () => {
      render(<App />)
      selectTeam('men-cau-1')

      selectScope('Femenino')

      expect(teamFilter().value).toBe('all')
      expect(listedMatches()).toBe(15)
    })
  })
})
