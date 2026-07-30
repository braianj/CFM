import type { Category, MatchEvent, MatchRosterEntry, PlayerStatistic } from '../types/tournament'

const normalizeName = (name: string) => name.trim().replace(/\s+/g, ' ')

const rowKey = (teamId: string, playerName: string) =>
  `${teamId}:${normalizeName(playerName).toLocaleLowerCase('es')}`

export function calculatePlayerStatistics(
  category: Category,
  events: MatchEvent[],
  rosters: MatchRosterEntry[] = [],
): PlayerStatistic[] {
  const rows = new Map<string, PlayerStatistic>()
  const appearances = new Map<string, Set<string>>()

  const getRow = (playerName: string, teamId: string) => {
    const key = rowKey(teamId, playerName)
    const existing = rows.get(key)
    if (existing) return existing
    const created: PlayerStatistic = {
      playerName: normalizeName(playerName),
      teamId,
      played: 0,
      goals: 0,
      assists: 0,
      points: 0,
      penalties: 0,
      majorPenalties: 0,
      penaltyMinutes: 0,
    }
    rows.set(key, created)
    return created
  }

  // Dressing for a match is playing it, so games played come from the match rosters.
  // A player counts once per match even if the roster holds duplicate entries.
  rosters.filter((entry) => entry.category === category).forEach((entry) => {
    getRow(entry.playerName, entry.teamId)
    const key = rowKey(entry.teamId, entry.playerName)
    const played = appearances.get(key) ?? new Set<string>()
    played.add(entry.matchId)
    appearances.set(key, played)
  })

  // An event whose jersey number nobody could match yet has no player name. It stays
  // published so the hole is visible, but it must not invent a nameless player row.
  events.filter((event) => event.category === category).forEach((event) => {
    if (event.type === 'goal') {
      if (event.playerName.trim()) getRow(event.playerName, event.teamId).goals += 1
      if (event.assistName?.trim()) getRow(event.assistName, event.teamId).assists += 1
      if (event.secondAssistName?.trim()) getRow(event.secondAssistName, event.teamId).assists += 1
      return
    }
    if (!event.playerName.trim()) return
    const row = getRow(event.playerName, event.teamId)
    row.penalties += 1
    row.penaltyMinutes += event.penaltyMinutes ?? 0
    if (event.type === 'major-penalty') row.majorPenalties += 1
  })

  rows.forEach((row, key) => {
    row.points = row.goals + row.assists
    row.played = appearances.get(key)?.size ?? 0
  })

  return [...rows.values()].sort((a, b) =>
    b.points - a.points ||
    b.goals - a.goals ||
    b.assists - a.assists ||
    a.penaltyMinutes - b.penaltyMinutes ||
    a.playerName.localeCompare(b.playerName, 'es'),
  )
}
