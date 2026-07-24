import type { Category, Match, ScoringRules, StandingRow, Team } from '../types/tournament'

type ResultMatch = Match & {
  homeTeamId: string
  awayTeamId: string
  homeScore: number
  awayScore: number
}

interface MiniTableRow {
  points: number
  goalDifference: number
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
      home.goalsFor += match.homeScore
      home.goalsAgainst += match.awayScore
      away.goalsFor += match.awayScore
      away.goalsAgainst += match.homeScore

      if (match.homeScore > match.awayScore) {
        home.points += scoring.win
        away.points += scoring.loss
      } else if (match.homeScore < match.awayScore) {
        away.points += scoring.win
        home.points += scoring.loss
      } else {
        home.points += scoring.draw
        away.points += scoring.draw
      }
    })

  return new Map(
    [...miniTable].map(([teamId, row]) => [
      teamId,
      { points: row.points, goalDifference: row.goalsFor - row.goalsAgainst },
    ]),
  )
}

function resolvePointsTie(
  rows: StandingRow[],
  matches: ResultMatch[],
  scoring: ScoringRules,
): StandingRow[] {
  if (rows.length !== 2 && rows.length !== 3) return [...rows].sort(compareOverall)

  const miniTable = createMiniTable(rows, matches, scoring)
  return [...rows].sort((a, b) => {
    const aMini = miniTable.get(a.team.id)!
    const bMini = miniTable.get(b.team.id)!
    return (
      bMini.points - aMini.points ||
      (rows.length === 3 ? bMini.goalDifference - aMini.goalDifference : 0) ||
      compareOverall(a, b)
    )
  })
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
      home.played += 1
      away.played += 1
      home.goalsFor += homeScore
      home.goalsAgainst += awayScore
      away.goalsFor += awayScore
      away.goalsAgainst += homeScore

      if (homeScore > awayScore) {
        home.won += 1
        away.lost += 1
        home.points += scoring.win
        away.points += scoring.loss
      } else if (homeScore < awayScore) {
        away.won += 1
        home.lost += 1
        away.points += scoring.win
        home.points += scoring.loss
      } else {
        home.drawn += 1
        away.drawn += 1
        home.points += scoring.draw
        away.points += scoring.draw
      }
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
