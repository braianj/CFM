import type { Match, MatchStatus } from '../types/tournament'

// The official fixture schedules consecutive games 60 minutes apart, so a longer
// window would leave two matches marked live at the same time.
export const MATCH_DURATION_MINUTES = 60

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
