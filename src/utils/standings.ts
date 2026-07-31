import type { Category, Match, MatchResolution, ScoringRules, StandingRow, Team } from '../types/tournament'

type ResultMatch = Match & {
  homeTeamId: string
  awayTeamId: string
  homeScore: number
  awayScore: number
}

interface MiniTableRow {
  points: number
  goalDifference: number
  goalsFor: number
}

const isBeyondRegulation = (match: Match) =>
  match.resolution === 'overtime' || match.resolution === 'shootout'

// Single source of truth for how a finished match pays out, so the table and every
// tie-breaking mini-table always agree.
function awardPoints(match: ResultMatch, scoring: ScoringRules) {
  if (match.homeScore === match.awayScore) return { home: scoring.draw, away: scoring.draw }

  const rewards: Record<MatchResolution, { winner: number; loser: number }> = {
    regulation: { winner: scoring.win, loser: scoring.loss },
    overtime: { winner: scoring.overtimeWin, loser: scoring.overtimeLoss },
    shootout: { winner: scoring.shootoutWin, loser: scoring.shootoutLoss },
  }
  const { winner, loser } = rewards[match.resolution ?? 'regulation']

  return match.homeScore > match.awayScore
    ? { home: winner, away: loser }
    : { home: loser, away: winner }
}

const compareOverall = (a: StandingRow, b: StandingRow) =>
  b.goalDifference - a.goalDifference ||
  b.goalsFor - a.goalsFor ||
  a.team.name.localeCompare(b.team.name, 'es')

const isResultMatch = (match: Match): match is ResultMatch =>
  match.status === 'finished' &&
  match.countsForStandings &&
  Boolean(match.homeTeamId) &&
  Boolean(match.awayTeamId) &&
  match.homeScore !== null &&
  match.awayScore !== null

function createMiniTable(
  rows: StandingRow[],
  matches: ResultMatch[],
  scoring: ScoringRules,
): Map<string, MiniTableRow> {
  const teamIds = new Set(rows.map((row) => row.team.id))
  const miniTable = new Map(
    rows.map((row) => [row.team.id, { points: 0, goalsFor: 0, goalsAgainst: 0 }]),
  )

  matches
    .filter((match) => teamIds.has(match.homeTeamId) && teamIds.has(match.awayTeamId))
    .forEach((match) => {
      const home = miniTable.get(match.homeTeamId)!
      const away = miniTable.get(match.awayTeamId)!
      const points = awardPoints(match, scoring)
      home.goalsFor += match.homeScore
      home.goalsAgainst += match.awayScore
      away.goalsFor += match.awayScore
      away.goalsAgainst += match.homeScore
      home.points += points.home
      away.points += points.away
    })

  return new Map(
    [...miniTable].map(([teamId, row]) => [
      teamId,
      { points: row.points, goalDifference: row.goalsFor - row.goalsAgainst, goalsFor: row.goalsFor },
    ]),
  )
}

// The Olympic method: teams level on points are separated by a table built only from
// the matches they played against each other. Two teams tied is the same rule as any
// other number, it just happens to read as "who won between them".
//
// It applies to however many teams are level. Restricting it to two or three would mean
// four tied teams got ordered by overall goal difference, which would put a team above
// one that beat it.
function resolvePointsTie(
  rows: StandingRow[],
  matches: ResultMatch[],
  scoring: ScoringRules,
): StandingRow[] {
  if (rows.length < 2) return rows

  const miniTable = createMiniTable(rows, matches, scoring)
  const compareMini = (a: StandingRow, b: StandingRow) => {
    const left = miniTable.get(a.team.id)!
    const right = miniTable.get(b.team.id)!
    return right.points - left.points ||
      right.goalDifference - left.goalDifference ||
      right.goalsFor - left.goalsFor
  }

  const groups = new Map<string, StandingRow[]>()
  rows.forEach((row) => {
    const mini = miniTable.get(row.team.id)!
    const key = `${mini.points}|${mini.goalDifference}|${mini.goalsFor}`
    groups.set(key, [...(groups.get(key) ?? []), row])
  })

  // The mini-table separated nobody, so there is nothing left but the overall record.
  if (groups.size === 1) return [...rows].sort(compareOverall)

  // Whoever is still level is re-compared using only the matches among themselves,
  // which is how a five-team tie can resolve down to a clean order. Every subgroup is
  // strictly smaller than what came in, so this always ends.
  return [...groups.values()]
    .sort((a, b) => compareMini(a[0], b[0]))
    .flatMap((group) => resolvePointsTie(group, matches, scoring))
}

export function calculateStandings(
  category: Category,
  teams: Team[],
  matches: Match[],
  scoring: ScoringRules,
): StandingRow[] {
  const rows = new Map<string, StandingRow>()
  const resultMatches = matches.filter(
    (match): match is ResultMatch => match.category === category && isResultMatch(match),
  )

  teams
    .filter((team) => team.category === category)
    .forEach((team) => {
      rows.set(team.id, {
        position: 0,
        team,
        played: 0,
        won: 0,
        overtimeWon: 0,
        overtimeLost: 0,
        drawn: 0,
        lost: 0,
        goalsFor: 0,
        goalsAgainst: 0,
        goalDifference: 0,
        points: 0,
      })
    })

  resultMatches.forEach((match) => {
      const home = rows.get(match.homeTeamId)
      const away = rows.get(match.awayTeamId)
      if (!home || !away) return

      const homeScore = match.homeScore
      const awayScore = match.awayScore
      const points = awardPoints(match, scoring)
      home.played += 1
      away.played += 1
      home.goalsFor += homeScore
      home.goalsAgainst += awayScore
      away.goalsFor += awayScore
      away.goalsAgainst += homeScore
      home.points += points.home
      away.points += points.away

      if (homeScore === awayScore) {
        home.drawn += 1
        away.drawn += 1
        return
      }

      const [winner, loser] = homeScore > awayScore ? [home, away] : [away, home]
      if (isBeyondRegulation(match)) {
        winner.overtimeWon += 1
        loser.overtimeLost += 1
        return
      }
      winner.won += 1
      loser.lost += 1
    })

  const completedRows = [...rows.values()].map((row) => ({
    ...row,
    goalDifference: row.goalsFor - row.goalsAgainst,
  }))
  const pointsGroups = completedRows.reduce((groups, row) => {
    groups.set(row.points, [...(groups.get(row.points) ?? []), row])
    return groups
  }, new Map<number, StandingRow[]>())
  const orderedRows = [...pointsGroups.entries()]
    .sort(([aPoints], [bPoints]) => bPoints - aPoints)
    .flatMap(([, tiedRows]) => resolvePointsTie(tiedRows, resultMatches, scoring))

  return orderedRows
    .map((row, index) => ({ ...row, position: index + 1 }))
}
