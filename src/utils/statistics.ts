import type { Category, MatchEvent, PlayerStatistic } from '../types/tournament'

const normalizeName = (name: string) => name.trim().replace(/\s+/g, ' ')

export function calculatePlayerStatistics(category: Category, events: MatchEvent[]): PlayerStatistic[] {
  const rows = new Map<string, PlayerStatistic>()
  const getRow = (playerName: string, teamId: string) => {
    const normalized = normalizeName(playerName)
    const key = `${teamId}:${normalized.toLocaleLowerCase('es')}`
    const existing = rows.get(key)
    if (existing) return existing
    const created: PlayerStatistic = {
      playerName: normalized,
      teamId,
      goals: 0,
      assists: 0,
      penalties: 0,
      majorPenalties: 0,
      penaltyMinutes: 0,
    }
    rows.set(key, created)
    return created
  }

  events.filter((event) => event.category === category).forEach((event) => {
    if (event.type === 'goal') {
      getRow(event.playerName, event.teamId).goals += 1
      if (event.assistName?.trim()) getRow(event.assistName, event.teamId).assists += 1
      return
    }
    const row = getRow(event.playerName, event.teamId)
    row.penalties += 1
    row.penaltyMinutes += event.penaltyMinutes ?? 0
    if (event.type === 'major-penalty') row.majorPenalties += 1
  })

  return [...rows.values()].sort((a, b) =>
    b.goals - a.goals ||
    b.assists - a.assists ||
    a.penaltyMinutes - b.penaltyMinutes ||
    a.playerName.localeCompare(b.playerName, 'es'),
  )
}
