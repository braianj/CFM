export type Category = 'men' | 'women'

export type MatchStatus = 'upcoming' | 'live' | 'finished' | 'postponed' | 'tbd'

export type MatchStage =
  | 'regular'
  | 'semifinal-a'
  | 'semifinal-b'
  | 'final-a'
  | 'final-b'
  | 'final'

export interface Team {
  id: string
  name: string
  category: Category
  shortName: string
  color?: string
  logo?: string
}

export interface Match {
  id: string
  category: Category
  startDateTime: string
  stage: MatchStage
  homeTeamId?: string
  awayTeamId?: string
  homeLabel?: string
  awayLabel?: string
  homeScore: number | null
  awayScore: number | null
  status: MatchStatus
  countsForStandings: boolean
  venue?: string
  notes?: string
}

export interface ScoringRules {
  win: number
  draw: number
  loss: number
}

export interface QualificationBand {
  from: number
  to: number
  label: string
  tone: 'primary' | 'secondary'
}

export interface TournamentConfig {
  category: Category
  name: string
  shortName: string
  timezone: string
  scoring: ScoringRules
  qualification: QualificationBand[]
}

export interface StandingRow {
  position: number
  team: Team
  played: number
  won: number
  drawn: number
  lost: number
  goalsFor: number
  goalsAgainst: number
  goalDifference: number
  points: number
}
