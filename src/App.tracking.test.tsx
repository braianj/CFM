import { fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const track = vi.fn()

vi.mock('./analytics', () => ({ track, initAnalytics: () => Promise.resolve() }))
vi.mock('./data/firestore', () => ({ subscribeToTournamentData: () => () => {} }))

const { default: App } = await import('./App')

describe('App tracking', () => {
  beforeEach(() => {
    localStorage.clear()
    track.mockClear()
  })
  afterEach(() => localStorage.clear())

  describe('when the visitor changes view', () => {
    it('should report the view and the tournament in scope', () => {
      render(<App />)

      fireEvent.click(screen.getByRole('button', { name: 'Posiciones' }))

      expect(track).toHaveBeenCalledWith('select_view', { view: 'standings', tournament: 'all' })
    })
  })

  describe('when the visitor changes tournament', () => {
    it('should report the tournament', () => {
      render(<App />)

      fireEvent.click(screen.getByRole('button', { name: 'Femenino' }))

      expect(track).toHaveBeenCalledWith('select_tournament', { tournament: 'women' })
    })
  })

  describe('when the visitor picks a team', () => {
    it('should report the team without any player name', () => {
      render(<App />)

      fireEvent.change(screen.getByLabelText('Equipo'), { target: { value: 'men-cau-1' } })

      expect(track).toHaveBeenCalledWith('select_team', {
        team_id: 'men-cau-1',
        team_name: 'CAU Blanco',
        category: 'men',
      })
    })

    it('should report going back to every team', () => {
      render(<App />)

      fireEvent.change(screen.getByLabelText('Equipo'), { target: { value: 'all' } })

      expect(track).toHaveBeenCalledWith('select_team', { team_id: 'all' })
    })
  })

  describe('when the visitor only scrolls', () => {
    it('should not report anything on the first render', () => {
      render(<App />)

      expect(track).not.toHaveBeenCalled()
    })
  })
})
