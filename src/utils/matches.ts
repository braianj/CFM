import type { Match } from '../types/tournament'

export const ALL_TEAMS = 'all'

const hasPendingParticipant = (match: Match) => !match.homeTeamId || !match.awayTeamId

// A team's listing keeps the playoff matches it could still reach, the same way the
// official per-team sheets list every round as "según clasificación".
export const filterMatchesByTeam = (matches: Match[], teamId: string) =>
  teamId === ALL_TEAMS
    ? matches
    : matches.filter(
        (match) =>
          match.homeTeamId === teamId || match.awayTeamId === teamId || hasPendingParticipant(match),
      )

// True once the published schedule holds exactly the matches of the versioned fixture.
export function isOfficialFixturePublished(published: Match[], official: Match[]) {
  const publishedIds = new Set(published.map((match) => match.id))
  return publishedIds.size === official.length && official.every((match) => publishedIds.has(match.id))
}

export const sortMatches = (matches: Match[]) =>
  [...matches].sort(
    (first, second) =>
      new Date(first.startDateTime).getTime() - new Date(second.startDateTime).getTime(),
  )

export function groupMatchesByDay(matches: Match[], timezone: string) {
  const groups = new Map<string, Match[]>()
  const dateKey = new Intl.DateTimeFormat('en-CA', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  })

  sortMatches(matches).forEach((match) => {
    const key = dateKey.format(new Date(match.startDateTime))
    groups.set(key, [...(groups.get(key) ?? []), match])
  })

  return [...groups.entries()].map(([date, dayMatches]) => ({ date, matches: dayMatches }))
}

export function getInitialMatchId(matches: Match[]): string | null {
  const ordered = sortMatches(matches)
  return (
    ordered.find((match) => match.status === 'live')?.id ??
    ordered.find((match) => match.status === 'upcoming')?.id ??
    ordered.at(-1)?.id ??
    null
  )
}
