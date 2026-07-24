export type Category = 'men' | 'women'

export type MatchStatus = 'upcoming' | 'live' | 'finished' | 'postponed' | 'tbd'

export type MatchStage =
  | 'regular'
  | 'repechaje'
  | 'repechaje-a'
  | 'repechaje-b'
  | 'semifinal-1'
  | 'semifinal-2'
  | 'third-place'
  | 'final'
  | 'final-a'
  | 'final-b'

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
  // A match tied at the end of regulation is decided in overtime, which is worth
  // fewer points than winning outright.
  decidedInOvertime?: boolean
  venue?: string
  notes?: string
}

export interface ScoringRules {
  win: number
  overtimeWin: number
  overtimeLoss: number
  loss: number
  draw: number
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
  // Regulation results only. Overtime results are counted separately.
  won: number
  overtimeWon: number
  overtimeLost: number
  drawn: number
  lost: number
  goalsFor: number
  goalsAgainst: number
  goalDifference: number
  points: number
}

export type MatchEventType = 'goal' | 'penalty' | 'major-penalty'

export interface MatchEvent {
  id: string
  matchId: string
  category: Category
  teamId: string
  type: MatchEventType
  playerId?: string
  playerName: string
  jerseyNumber?: number
  assistId?: string
  assistName?: string
  secondAssistId?: string
  secondAssistName?: string
  period?: number
  gameTime?: string
  minute?: number
  penaltyMinutes?: number
  reason?: string
  notes?: string
}

// Squad role declared on the club's registration sheet.
export type PlayerRole = 'C' | 'A' | 'GK'

export interface Player {
  id: string
  category: Category
  teamId: string
  name: string
  role?: PlayerRole
  number?: number
  active: boolean
}

export interface MatchRosterEntry {
  id: string
  matchId: string
  category: Category
  teamId: string
  playerId: string
  playerName: string
  jerseyNumber: number
}

export interface PlayerStatistic {
  playerName: string
  teamId: string
  goals: number
  assists: number
  points: number
  penalties: number
  majorPenalties: number
  penaltyMinutes: number
}
