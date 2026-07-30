import type { Match, MatchEvent, MatchRosterEntry } from '../types/tournament'
import { buildMatchSummary } from './matchSummary'

export interface MatchProgress {
  /** Both scores loaded. Zero is a result; null is not. */
  hasResult: boolean
  /** Players listed as having dressed for this match. */
  calledUp: number
  /** Goals and penalties published for this match. */
  events: number
  /** Of those, the ones still waiting for something the scoresheet did not give. */
  pending: number
  /** Nothing left to load or complete. */
  done: boolean
}

// What the panel needs to tell an operator, at a glance, whether a match is finished
// being loaded. Kept out of the components because "done" is a rule, not a layout:
// a match is done when the result is in, somebody dressed, something was published
// and none of it is still waiting on an unreadable field.
export function getMatchProgress(
  match: Match,
  rosters: MatchRosterEntry[],
  events: MatchEvent[],
): MatchProgress {
  // Team names are irrelevant here, only what each line is still missing.
  const lines = buildMatchSummary(match.id, events, [], rosters)
  const calledUp = rosters.filter((entry) => entry.matchId === match.id).length
  const pending = lines.filter((line) => line.missing.length > 0 || line.notes).length
  const hasResult = match.homeScore !== null && match.awayScore !== null
  return {
    hasResult,
    calledUp,
    events: lines.length,
    pending,
    done: hasResult && calledUp > 0 && lines.length > 0 && pending === 0,
  }
}

// The number the organisation prints on the scoresheet, which is what the operator
// has in front of them. Only the numbered fixture rounds have one; a playoff or a
// match created from the panel is identified by its stage instead.
const OFFICIAL_CODE = /^([hd])-(\d+)$/

export function getMatchCode(matchId: string) {
  const official = OFFICIAL_CODE.exec(matchId)
  return official ? `${official[1].toUpperCase()}-${official[2]}` : ''
}
