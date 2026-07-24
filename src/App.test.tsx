import { fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import App from './App'

vi.mock('./data/firestore', () => ({ subscribeToTournamentData: () => () => {} }))

const teamFilter = () => screen.getByLabelText('Equipo') as HTMLSelectElement

const selectTeam = (teamId: string) => fireEvent.change(teamFilter(), { target: { value: teamId } })

const listedMatches = () => screen.getAllByRole('article').length

describe('App', () => {
  beforeEach(() => localStorage.clear())
  afterEach(() => localStorage.clear())

  describe('when no team is selected', () => {
    it('should list every match of the tournament', () => {
      render(<App />)

      expect(listedMatches()).toBe(19)
    })
  })

  describe('when a team is selected', () => {
    it('should list only its matches and the playoffs it could reach', () => {
      render(<App />)

      selectTeam('men-cau-1')

      expect(listedMatches()).toBe(9)
    })

    it('should remember the selected team across visits', () => {
      const { unmount } = render(<App />)
      selectTeam('men-cau-1')
      unmount()

      render(<App />)

      expect(teamFilter().value).toBe('men-cau-1')
    })
  })

  describe('when the tournament changes', () => {
    it('should clear a filter that belongs to the other category', () => {
      render(<App />)
      selectTeam('men-cau-1')

      fireEvent.click(screen.getByRole('button', { name: 'Femenino' }))

      expect(teamFilter().value).toBe('all')
      expect(listedMatches()).toBe(15)
    })
  })
})
