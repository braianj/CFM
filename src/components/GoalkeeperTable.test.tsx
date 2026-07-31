import { render } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import type { Team } from '../types/tournament'
import type { GoalkeeperStatistic } from '../utils/goalkeepers'
import { GoalkeeperTable } from './GoalkeeperTable'

const teams: Team[] = [{ id: 'men-cau-3', name: 'CAU Negro', category: 'men', shortName: 'Negro' }]

const row = (overrides: Partial<GoalkeeperStatistic> = {}): GoalkeeperStatistic => ({
  playerName: 'Joaquin Bernales',
  teamId: 'men-cau-3',
  played: 1,
  minutes: 30,
  saves: 15,
  goalsAgainst: 5,
  shotsOnTarget: 20,
  savePercentage: 0.75,
  ...overrides,
})

const cells = () => Array.from(document.querySelectorAll('tbody tr')[0].children).map((cell) => cell.textContent)

describe('GoalkeeperTable', () => {
  describe('when a goalkeeper faced shots', () => {
    it('should show the shots, the saves, the goals and the percentage', () => {
      render(<GoalkeeperTable rows={[row()]} teams={teams} />)

      expect(cells()).toEqual(['Joaquin Bernales', 'Negro', '1', '30', '20', '15', '5', '75%'])
    })

    it('should round the percentage to one decimal', () => {
      render(<GoalkeeperTable rows={[row({ saves: 2, goalsAgainst: 1, shotsOnTarget: 3, savePercentage: 2 / 3 })]} teams={teams} />)

      expect(cells().at(-1)).toBe('66.7%')
    })
  })

  describe('when a goalkeeper faced nothing', () => {
    it('should show a dash instead of a percentage', () => {
      render(<GoalkeeperTable rows={[row({ saves: 0, goalsAgainst: 0, shotsOnTarget: 0, savePercentage: null })]} teams={teams} />)

      expect(cells().at(-1)).toBe('—')
    })
  })

  describe('when the minutes were never written down', () => {
    it('should show a dash rather than zero minutes played', () => {
      render(<GoalkeeperTable rows={[row({ minutes: 0 })]} teams={teams} />)

      expect(cells()[3]).toBe('—')
    })
  })

  describe('when no goalkeeper line has been loaded', () => {
    it('should show nothing at all', () => {
      const { container } = render(<GoalkeeperTable rows={[]} teams={teams} />)

      expect(container).toBeEmptyDOMElement()
    })
  })
})
