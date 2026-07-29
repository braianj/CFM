import type { MatchEvent, MatchEventType, MatchRosterEntry, Team } from '../types/tournament'

export interface MatchSummaryLine {
  id: string
  type: MatchEventType
  period?: number
  gameTime?: string
  teamId: string
  teamName: string
  /** Scorer or penalised player, prefixed with the jersey number when it is known. */
  player: string
  /** Only goals carry assists, already prefixed with their own jersey numbers. */
  assists: string[]
  penaltyMinutes?: number
}

const GAME_CLOCK = /^(\d{1,2}):([0-5]\d)$/

const normalizeName = (name: string) => name.trim().replace(/\s+/g, ' ')
const rosterKey = (teamId: string, playerName: string) =>
  `${teamId}:${normalizeName(playerName).toLocaleLowerCase('es')}`

// The game clock counts down inside each period, so more time left means earlier.
const remainingSeconds = (gameTime?: string) => {
  const parsed = GAME_CLOCK.exec(gameTime?.trim() ?? '')
  return parsed ? Number(parsed[1]) * 60 + Number(parsed[2]) : null
}

// Anything the sheet left blank sinks to the end of its period instead of jumping
// to the top, which is what sorting an absent clock as zero would do.
function inPlayingOrder(a: MatchSummaryLine, b: MatchSummaryLine) {
  const period = (a.period ?? Number.MAX_SAFE_INTEGER) - (b.period ?? Number.MAX_SAFE_INTEGER)
  if (period !== 0) return period
  const left = remainingSeconds(a.gameTime)
  const right = remainingSeconds(b.gameTime)
  if (left === null || right === null) return (left === null ? 1 : 0) - (right === null ? 1 : 0)
  return right - left
}

// Turns the published events of one match into the running order the scoresheet
// describes: by period, and inside a period from the opening face-off to the horn.
export function buildMatchSummary(
  matchId: string,
  events: MatchEvent[],
  teams: Team[],
  rosters: MatchRosterEntry[] = [],
): MatchSummaryLine[] {
  // Assists are stored by name only, so their jersey number comes from the roster
  // of this match: the number belongs to the call-up, not to the player.
  const numbers = new Map<string, number>()
  rosters
    .filter((entry) => entry.matchId === matchId)
    .forEach((entry) => numbers.set(rosterKey(entry.teamId, entry.playerName), entry.jerseyNumber))

  const named = (teamId: string, playerName: string, jerseyNumber?: number) => {
    const name = normalizeName(playerName)
    const number = jerseyNumber ?? numbers.get(rosterKey(teamId, name))
    return number === undefined ? name : `#${number} ${name}`
  }

  return events
    .filter((event) => event.matchId === matchId)
    .map<MatchSummaryLine>((event) => ({
      id: event.id,
      type: event.type,
      period: event.period,
      gameTime: event.gameTime,
      teamId: event.teamId,
      teamName: teams.find((team) => team.id === event.teamId)?.name ?? '',
      player: named(event.teamId, event.playerName, event.jerseyNumber),
      assists:
        event.type === 'goal'
          ? [event.assistName, event.secondAssistName]
              .filter((name): name is string => Boolean(name?.trim()))
              .map((name) => named(event.teamId, name))
          : [],
      penaltyMinutes: event.type === 'goal' ? undefined : event.penaltyMinutes,
    }))
    .sort(inPlayingOrder)
}
