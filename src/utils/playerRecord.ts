import type { Match, MatchEvent, MatchRosterEntry, Player, Team } from '../types/tournament'
import { elapsedTime } from './matchSummary'
import { sortMatches } from './matches'

export type PlayerActionType = 'goal' | 'assist' | 'penalty' | 'major-penalty'

export interface PlayerAction {
  id: string
  type: PlayerActionType
  period?: number
  /** Minutes played when it happened, the way the site reads a clock. */
  elapsed?: string
  penaltyMinutes?: number
  /** On a goal, who set it up; on an assist, who scored. */
  withPlayer?: string
}

export interface PlayerMatch {
  matchId: string
  startDateTime: string
  opponent: string
  jerseyNumber?: number
  actions: PlayerAction[]
}

export interface PlayerRecord {
  played: number
  goals: number
  assists: number
  points: number
  penalties: number
  majorPenalties: number
  penaltyMinutes: number
  /** Every match dressed for, most recent first. */
  matches: PlayerMatch[]
}

const normalizeName = (name: string) => name.trim().replace(/\s+/g, ' ')
const same = (left: string | undefined, right: string) =>
  normalizeName(left ?? '').toLocaleLowerCase('es') === normalizeName(right).toLocaleLowerCase('es')

// What one player did across the tournament: the totals, and underneath them the
// matches they dressed for with what happened in each. Identity is the name inside a
// team, the same key the statistics table uses, because an event may carry no player id.
export function buildPlayerRecord(
  player: Player,
  matches: Match[],
  teams: Team[],
  rosters: MatchRosterEntry[],
  events: MatchEvent[],
): PlayerRecord {
  const mine = (name: string | undefined) => Boolean(name?.trim()) && same(name, player.name)
  const teamName = (id?: string) => teams.find((team) => team.id === id)?.name ?? 'A confirmar'

  const dressed = rosters.filter((entry) => entry.teamId === player.teamId && mine(entry.playerName))
  const byMatch = new Map(dressed.map((entry) => [entry.matchId, entry]))

  const totals = { goals: 0, assists: 0, penalties: 0, majorPenalties: 0, penaltyMinutes: 0 }
  const actions = new Map<string, PlayerAction[]>()
  const add = (matchId: string, action: PlayerAction) =>
    actions.set(matchId, [...(actions.get(matchId) ?? []), action])

  events
    .filter((event) => event.teamId === player.teamId)
    .forEach((event) => {
      const when = { period: event.period, elapsed: elapsedTime(event.period, event.gameTime) }
      if (event.type === 'goal') {
        if (mine(event.playerName)) {
          totals.goals += 1
          add(event.matchId, {
            id: event.id, type: 'goal', ...when,
            withPlayer: event.assistName?.trim() || undefined,
          })
          return
        }
        if (mine(event.assistName) || mine(event.secondAssistName)) {
          totals.assists += 1
          add(event.matchId, {
            id: `${event.id}-a`, type: 'assist', ...when,
            withPlayer: event.playerName.trim() || undefined,
          })
        }
        return
      }
      if (!mine(event.playerName)) return
      totals.penalties += 1
      totals.penaltyMinutes += event.penaltyMinutes ?? 0
      if (event.type === 'major-penalty') totals.majorPenalties += 1
      add(event.matchId, { id: event.id, type: event.type, ...when, penaltyMinutes: event.penaltyMinutes })
    })

  // A match where they only appear in an event but not in a call-up still counts as
  // something that happened, so it is listed rather than silently dropped.
  const played = new Set([...byMatch.keys(), ...actions.keys()])
  const listed = sortMatches(matches.filter((match) => played.has(match.id))).reverse()

  return {
    played: byMatch.size,
    ...totals,
    points: totals.goals + totals.assists,
    matches: listed.map((match) => ({
      matchId: match.id,
      startDateTime: match.startDateTime,
      opponent: teamName(match.homeTeamId === player.teamId ? match.awayTeamId : match.homeTeamId),
      jerseyNumber: byMatch.get(match.id)?.jerseyNumber,
      actions: actions.get(match.id) ?? [],
    })),
  }
}
