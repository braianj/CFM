import type { Category, MatchEvent } from '../types/tournament'

// Three minor penalties in one match eject the player and cost them the next one.
export const MINORS_FOR_EJECTION = 3
// Fifteen penalty minutes across the tournament also cost one match. The player may
// finish the current one, unless they were ejected for minors in it.
export const MINUTES_FOR_SUSPENSION = 15

export type SuspensionReason = 'three-minors' | 'penalty-minutes'

export interface PlayerDiscipline {
  playerName: string
  teamId: string
  minorPenalties: number
  majorPenalties: number
  penaltyMinutes: number
  /** Matches where the player collected enough minors to be ejected. */
  ejectedFrom: string[]
  reasons: SuspensionReason[]
}

const normalizeName = (name: string) => name.trim().replace(/\s+/g, ' ')
const rowKey = (teamId: string, playerName: string) =>
  `${teamId}:${normalizeName(playerName).toLocaleLowerCase('es')}`

// Reports what the discipline rules say about each player. It counts and flags; it
// never decides which match somebody misses, because that is the organisation's call.
export function calculateDiscipline(category: Category, events: MatchEvent[]): PlayerDiscipline[] {
  const rows = new Map<string, PlayerDiscipline>()
  const minorsPerMatch = new Map<string, Map<string, number>>()

  events
    // A penalty whose jersey number is still unmatched cannot be attributed to
    // anybody, so it is left out rather than counted against a nameless row.
    .filter((event) => event.category === category && event.type !== 'goal' && event.playerName.trim())
    .forEach((event) => {
      const key = rowKey(event.teamId, event.playerName)
      const row = rows.get(key) ?? {
        playerName: normalizeName(event.playerName),
        teamId: event.teamId,
        minorPenalties: 0,
        majorPenalties: 0,
        penaltyMinutes: 0,
        ejectedFrom: [],
        reasons: [],
      }
      row.penaltyMinutes += event.penaltyMinutes ?? 0

      if (event.type === 'major-penalty') {
        row.majorPenalties += 1
      } else {
        row.minorPenalties += 1
        const byMatch = minorsPerMatch.get(key) ?? new Map<string, number>()
        byMatch.set(event.matchId, (byMatch.get(event.matchId) ?? 0) + 1)
        minorsPerMatch.set(key, byMatch)
      }

      rows.set(key, row)
    })

  rows.forEach((row, key) => {
    row.ejectedFrom = [...(minorsPerMatch.get(key) ?? new Map())]
      .filter(([, minors]) => minors >= MINORS_FOR_EJECTION)
      .map(([matchId]) => matchId)
    if (row.ejectedFrom.length) row.reasons.push('three-minors')
    if (row.penaltyMinutes >= MINUTES_FOR_SUSPENSION) row.reasons.push('penalty-minutes')
  })

  return [...rows.values()]
    .filter((row) => row.reasons.length)
    .sort((a, b) =>
      b.penaltyMinutes - a.penaltyMinutes ||
      b.minorPenalties - a.minorPenalties ||
      a.playerName.localeCompare(b.playerName, 'es'),
    )
}
