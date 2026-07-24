import type { Category, Match, ScoringRules, StandingRow, Team } from '../types/tournament'

const compareRows = (a: StandingRow, b: StandingRow) =>
  b.points - a.points ||
  b.goalDifference - a.goalDifference ||
  b.goalsFor - a.goalsFor ||
  a.team.name.localeCompare(b.team.name, 'es')

export function calculateStandings(
  category: Category,
  teams: Team[],
  matches: Match[],
  scoring: ScoringRules,
): StandingRow[] {
  const rows = new Map<string, StandingRow>()

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

  matches
    .filter(
      (match) =>
        match.category === category &&
        match.status === 'finished' &&
        match.countsForStandings &&
        match.homeTeamId &&
        match.awayTeamId &&
        match.homeScore !== null &&
        match.awayScore !== null,
    )
    .forEach((match) => {
      const home = rows.get(match.homeTeamId!)
      const away = rows.get(match.awayTeamId!)
      if (!home || !away) return

      const homeScore = match.homeScore!
      const awayScore = match.awayScore!
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

  return [...rows.values()]
    .map((row) => ({ ...row, goalDifference: row.goalsFor - row.goalsAgainst }))
    .sort(compareRows)
    .map((row, index) => ({ ...row, position: index + 1 }))
}
