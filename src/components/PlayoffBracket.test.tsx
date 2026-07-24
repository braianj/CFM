import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import type { Category } from '../types/tournament'
import { getMatchesByCategory } from '../data/matches'
import { getTeamsByCategory } from '../data/teams'
import { stageLabels } from '../data/tournamentConfig'
import { PlayoffBracket } from './PlayoffBracket'

const renderBracket = (category: Category) =>
  render(
    <PlayoffBracket
      category={category}
      matches={getMatchesByCategory(category)}
      teams={getTeamsByCategory(category)}
    />,
  )

describe('PlayoffBracket', () => {
  describe('when the men’s tournament is selected', () => {
    it('should render both repechajes and both finals', () => {
      renderBracket('men')

      expect(screen.getByText('Repechaje A')).toBeInTheDocument()
      expect(screen.getByText('Repechaje B')).toBeInTheDocument()
      expect(screen.getByText('Final A')).toBeInTheDocument()
      expect(screen.getByText('Final B')).toBeInTheDocument()
    })

    it('should name the pending participants of the Final A', () => {
      renderBracket('men')

      expect(screen.getByText('1.º de fase regular')).toBeInTheDocument()
      expect(screen.getByText('Ganador del Repechaje A')).toBeInTheDocument()
    })
  })

  describe('when the women’s tournament is selected', () => {
    it('should render the repechaje, both semifinals, the third place and the final', () => {
      renderBracket('women')

      expect(screen.getAllByText('Repechaje').length).toBeGreaterThan(0)
      expect(screen.getByText('Semifinal 1')).toBeInTheDocument()
      expect(screen.getByText('Semifinal 2')).toBeInTheDocument()
      expect(screen.getByText('Tercer puesto')).toBeInTheDocument()
      expect(screen.getAllByText('Final').length).toBeGreaterThan(0)
    })
  })

  describe('when the fixture defines a playoff stage', () => {
    it.each(['men', 'women'] as Category[])('should display every %s playoff match', (category) => {
      renderBracket(category)

      getMatchesByCategory(category)
        .filter((match) => match.stage !== 'regular')
        .forEach((match) => {
          expect(screen.getAllByText(stageLabels[match.stage]).length).toBeGreaterThan(0)
        })
    })
  })
})
