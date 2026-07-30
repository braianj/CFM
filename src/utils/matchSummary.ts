import type { MatchEvent, MatchEventType, MatchRosterEntry, Team } from '../types/tournament'
import { periodLengthMinutes } from './matchStatus'

/** Shown where a name should be while the jersey number has no player matched to it. */
export const UNASSIGNED = 'sin asignar'

export interface MatchSummaryLine {
  id: string
  type: MatchEventType
  period?: number
  /** Minutes played when it happened, which is what a spectator reads off a clock. */
  elapsed?: string
  /** What was left on the rink clock, exactly as the scoresheet writes it. */
  remaining?: string
  teamId: string
  teamName: string
  /** Scorer or penalised player, prefixed with the jersey number when it is known. */
  player: string
  /** Only goals carry assists, already prefixed with their own jersey numbers. */
  assists: string[]
  penaltyMinutes?: number
  /** Whatever the scoresheet left unreadable, so the panel can ask for exactly that. */
  missing: string[]
  /**
   * What the paper says where it could not be turned into a field: an assist whose
   * number is illegible, a clock that cannot be right. `missing` cannot express those,
   * so without this the line would read as settled.
   */
  notes?: string
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

const formatClock = (seconds: number) => `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`

// The scoresheet writes the countdown clock, but a result is read as time played: a
// goal with 2:50 left in a fifteen-minute period was scored at 12:10. Inverting it
// needs the period, because overtime is shorter than a regulation one. A clock that
// does not fit its period cannot be inverted, so it is reported as it was written
// rather than turned into an invented number.
export function elapsedTime(period: number | undefined, gameTime: string | undefined) {
  const remaining = remainingSeconds(gameTime)
  if (remaining === null) return gameTime?.trim() || undefined
  if (period === undefined) return gameTime?.trim()
  const total = periodLengthMinutes(period) * 60
  return remaining > total ? gameTime?.trim() : formatClock(total - remaining)
}

// Anything the sheet left blank sinks to the end of its period instead of jumping
// to the top, which is what sorting an absent clock as zero would do.
function inPlayingOrder(a: MatchSummaryLine, b: MatchSummaryLine) {
  const period = (a.period ?? Number.MAX_SAFE_INTEGER) - (b.period ?? Number.MAX_SAFE_INTEGER)
  if (period !== 0) return period
  const left = remainingSeconds(a.remaining)
  const right = remainingSeconds(b.remaining)
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

  // A number with nobody behind it is written out as such: the scoresheet did record
  // somebody, and hiding the row would lose that.
  const named = (teamId: string, playerName: string, jerseyNumber?: number) => {
    const name = normalizeName(playerName)
    const number = jerseyNumber ?? numbers.get(rosterKey(teamId, name))
    if (!name) return number === undefined ? UNASSIGNED : `#${number} ${UNASSIGNED}`
    return number === undefined ? name : `#${number} ${name}`
  }

  return events
    .filter((event) => event.matchId === matchId)
    .map<MatchSummaryLine>((event) => {
      const assists =
        event.type === 'goal'
          ? ([
              [event.assistName, event.assistJerseyNumber],
              [event.secondAssistName, event.secondAssistJerseyNumber],
            ] as const)
              .filter(([name, number]) => Boolean(name?.trim()) || number !== undefined)
              .map(([name, number]) => named(event.teamId, name ?? '', number))
          : []
      const penaltyMinutes = event.type === 'goal' ? undefined : event.penaltyMinutes
      const player = named(event.teamId, event.playerName, event.jerseyNumber)
      return {
        id: event.id,
        type: event.type,
        period: event.period,
        elapsed: elapsedTime(event.period, event.gameTime),
        remaining: event.gameTime?.trim() || undefined,
        teamId: event.teamId,
        teamName: teams.find((team) => team.id === event.teamId)?.name ?? '',
        player,
        assists,
        penaltyMinutes,
        notes: event.notes?.trim() || undefined,
        missing: [
          ...(player.includes(UNASSIGNED) ? ['jugador'] : []),
          ...(assists.some((assist) => assist.includes(UNASSIGNED)) ? ['asistencia'] : []),
          ...(event.period === undefined ? ['período'] : []),
          ...(remainingSeconds(event.gameTime) === null ? ['tiempo'] : []),
          ...(event.type !== 'goal' && penaltyMinutes === undefined ? ['minutos'] : []),
        ],
      }
    })
    .sort(inPlayingOrder)
}
