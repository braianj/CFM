import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import type { Match, Team } from '../types/tournament'
import { TIMEZONE } from '../data/tournamentConfig'
import type { MatchSummaryLine } from '../utils/matchSummary'
import { MatchCard } from './MatchCard'

const teams: Team[] = [
  { id: 'men-cau-3', name: 'CAU Negro', category: 'men', shortName: 'Negro' },
  { id: 'men-cau-2', name: 'CAU Verde', category: 'men', shortName: 'Verde' },
]

const match: Match = {
  id: 'h-4',
  category: 'men',
  startDateTime: '2026-07-27T21:30:00-03:00',
  stage: 'regular',
  homeTeamId: 'men-cau-3',
  awayTeamId: 'men-cau-2',
  homeScore: 1,
  awayScore: 0,
  status: 'finished',
  countsForStandings: true,
}

const summary: MatchSummaryLine[] = [
  {
    id: 'gol',
    type: 'goal',
    period: 1,
    gameTime: '2:50',
    teamId: 'men-cau-3',
    teamName: 'CAU Negro',
    player: '#92 Martín Baeza',
    assists: [],
  },
  {
    id: 'falta',
    type: 'penalty',
    period: 1,
    gameTime: '5:30',
    teamId: 'men-cau-2',
    teamName: 'CAU Verde',
    player: '#6 Joaquín Cuitiño',
    assists: [],
    penaltyMinutes: 2,
  },
]

const card = (lines: MatchSummaryLine[]) =>
  render(<MatchCard match={match} teams={teams} timezone={TIMEZONE} summary={lines} />)

describe('MatchCard', () => {
  describe('when the match has published events', () => {
    it('should keep the summary folded until it is opened', () => {
      card(summary)

      expect(screen.getByRole('button')).toHaveAttribute('aria-expanded', 'false')
      expect(document.getElementById('match-h-4-summary')).toHaveAttribute('hidden')
    })

    it('should unfold what happened when the card is clicked', () => {
      card(summary)

      fireEvent.click(screen.getByRole('button'))

      expect(screen.getByRole('button')).toHaveAttribute('aria-expanded', 'true')
      expect(document.getElementById('match-h-4-summary')).not.toHaveAttribute('hidden')
      expect(screen.getByText('#92 Martín Baeza')).toBeInTheDocument()
      expect(screen.getByText("Falta 2'")).toBeInTheDocument()
    })
  })

  describe('when nothing was published for the match', () => {
    it('should not pretend the card can be opened', () => {
      card([])

      expect(screen.queryByRole('button')).not.toBeInTheDocument()
    })
  })
})
