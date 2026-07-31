import type { Category, MatchRosterEntry } from '../types/tournament'

export interface GoalkeeperStatistic {
  playerName: string
  teamId: string
  /** Matches with a goalkeeper line loaded, counted once per match. */
  played: number
  minutes: number
  saves: number
  goalsAgainst: number
  /** Every shot that reached the net: the ones stopped plus the ones that went in. */
  shotsOnTarget: number
  /** Saves over shots on target. Null while nothing has been faced, never zero. */
  savePercentage: number | null
}

const normalizeName = (name: string) => name.trim().replace(/\s+/g, ' ')
const rowKey = (teamId: string, playerName: string) =>
  `${teamId}:${normalizeName(playerName).toLocaleLowerCase('es')}`

// A roster entry describes a goalkeeper's match only once any part of the line was
// written down. Somebody who dressed as an outfield player has none of these, and a
// goalkeeper whose line was left blank is not counted as having faced zero shots.
export const hasGoalkeeperLine = (entry: MatchRosterEntry) =>
  entry.saves !== undefined || entry.goalsAgainst !== undefined || entry.minutesPlayed !== undefined

// Goalkeeping is counted off the scoresheet footer rather than derived from the
// events: two keepers can split a match, and only the sheet says where the change
// happened. Shots on target are computed, never stored, so they cannot disagree
// with the saves and the goals they are made of.
export function calculateGoalkeeperStatistics(
  category: Category,
  rosters: MatchRosterEntry[],
): GoalkeeperStatistic[] {
  const rows = new Map<string, GoalkeeperStatistic>()
  const appearances = new Map<string, Set<string>>()

  rosters
    .filter((entry) => entry.category === category && hasGoalkeeperLine(entry))
    .forEach((entry) => {
      const key = rowKey(entry.teamId, entry.playerName)
      const row = rows.get(key) ?? {
        playerName: normalizeName(entry.playerName),
        teamId: entry.teamId,
        played: 0,
        minutes: 0,
        saves: 0,
        goalsAgainst: 0,
        shotsOnTarget: 0,
        savePercentage: null,
      }
      row.saves += entry.saves ?? 0
      row.goalsAgainst += entry.goalsAgainst ?? 0
      row.minutes += entry.minutesPlayed ?? 0
      rows.set(key, row)

      const played = appearances.get(key) ?? new Set<string>()
      played.add(entry.matchId)
      appearances.set(key, played)
    })

  rows.forEach((row, key) => {
    row.played = appearances.get(key)?.size ?? 0
    row.shotsOnTarget = row.saves + row.goalsAgainst
    row.savePercentage = row.shotsOnTarget === 0 ? null : row.saves / row.shotsOnTarget
  })

  return [...rows.values()].sort((a, b) =>
    // A goalkeeper who has faced nothing has no percentage to rank, so they go last
    // rather than pretending to be perfect or hopeless.
    (b.savePercentage ?? -1) - (a.savePercentage ?? -1) ||
    b.saves - a.saves ||
    a.goalsAgainst - b.goalsAgainst ||
    a.playerName.localeCompare(b.playerName, 'es'),
  )
}
