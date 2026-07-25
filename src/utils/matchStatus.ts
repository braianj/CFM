import type { Match, MatchStatus } from '../types/tournament'

// How the game is actually played.
export const REGULATION_PERIODS = 2
export const PERIOD_MINUTES = 15
export const OVERTIME_MINUTES = 5
export const TIMEOUTS_PER_TEAM = 1
// The clock stops on every whistle, except once a team leads by this much.
export const RUNNING_CLOCK_LEAD = 5

// How long a match shows as live. This is wall-clock time, not played time: with a
// stopped clock, two 15-minute periods take considerably longer than 30 minutes.
// The fixture schedules a match every 60 minutes and the zamboni 40 minutes after
// the last one starts, so 40 is the schedule's own estimate. It must never exceed
// the smallest gap between two slots, or two matches would be live at the same time.
export const MATCH_DURATION_MINUTES = 40

export function getAutomaticMatchStatus(match: Match, now = new Date()): MatchStatus {
  if (match.status === 'postponed') return 'postponed'
  if (!match.homeTeamId || !match.awayTeamId) return 'tbd'

  const start = new Date(match.startDateTime).getTime()
  const end = start + MATCH_DURATION_MINUTES * 60_000
  const current = now.getTime()

  if (current < start) return 'upcoming'
  if (current < end) return 'live'
  return 'finished'
}

export const applyAutomaticMatchStatuses = (matches: Match[], now = new Date()): Match[] =>
  matches.map((match) => ({ ...match, status: getAutomaticMatchStatus(match, now) }))
