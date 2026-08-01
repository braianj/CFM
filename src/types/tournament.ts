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
  // How the match was settled. Absent means it ended inside regulation time.
  resolution?: MatchResolution
  venue?: string
  notes?: string
}

// A match tied at the end of regulation goes to overtime, and to a shootout if it
// is still tied. Both are worth fewer points than winning outright. A walkover is not
// a way of playing the match, it is what happens when one side does not turn up.
export type MatchResolution = 'regulation' | 'overtime' | 'shootout' | 'walkover'

export interface ScoringRules {
  win: number
  overtimeWin: number
  overtimeLoss: number
  shootoutWin: number
  shootoutLoss: number
  // A side that does not turn up. Priced apart from a regulation win so the
  // organisation can decide what a walkover is worth without touching anything else.
  walkoverWin: number
  walkoverLoss: number
  loss: number
  // Only a safety net for malformed data: these tournaments have no draws.
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
  // Empty while the scoresheet records a jersey number nobody could match to a
  // player yet. The event is published anyway so the hole is visible and fixable.
  playerName: string
  jerseyNumber?: number
  assistId?: string
  assistName?: string
  assistJerseyNumber?: number
  secondAssistId?: string
  secondAssistName?: string
  secondAssistJerseyNumber?: number
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
  // The goalkeeper's line for this match, copied from the scoresheet footer. Absent
  // for everybody else, and absent for a goalkeeper whose line was not filled in.
  // Shots on target are not stored: they are saves plus goals against.
  saves?: number
  goalsAgainst?: number
  minutesPlayed?: number
}

export interface PlayerStatistic {
  playerName: string
  teamId: string
  // Matches the player dressed for, counted from the match rosters.
  played: number
  goals: number
  assists: number
  points: number
  penalties: number
  majorPenalties: number
  penaltyMinutes: number
}
