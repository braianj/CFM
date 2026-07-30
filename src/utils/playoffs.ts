import { tournamentConfigs } from '../data/tournamentConfig'
import type { Category, Match, MatchStage, Team } from '../types/tournament'
import { calculateStandings } from './standings'

/** Where a playoff participant comes from. */
type Source =
  | { from: 'position'; position: number }
  | { from: 'winner'; stage: MatchStage }
  | { from: 'loser'; stage: MatchStage }

const at = (position: number): Source => ({ from: 'position', position })
const winnerOf = (stage: MatchStage): Source => ({ from: 'winner', stage })
const loserOf = (stage: MatchStage): Source => ({ from: 'loser', stage })

// The bracket exactly as the organisation wrote it. The men's tournament has no
// semifinals and the women's has no Final A/B, so the two are listed apart.
const brackets: Record<Category, Partial<Record<MatchStage, { home: Source; away: Source }>>> = {
  men: {
    'repechaje-a': { home: at(2), away: at(3) },
    'repechaje-b': { home: at(5), away: at(6) },
    'final-a': { home: at(1), away: winnerOf('repechaje-a') },
    'final-b': { home: at(4), away: winnerOf('repechaje-b') },
  },
  women: {
    repechaje: { home: at(5), away: at(4) },
    'semifinal-2': { home: at(2), away: at(3) },
    'semifinal-1': { home: winnerOf('repechaje'), away: at(1) },
    'third-place': { home: loserOf('semifinal-1'), away: loserOf('semifinal-2') },
    final: { home: winnerOf('semifinal-1'), away: winnerOf('semifinal-2') },
  },
}

const isSettled = (match: Match) =>
  match.homeScore !== null && match.awayScore !== null && Boolean(match.homeTeamId) && Boolean(match.awayTeamId)

// The seeding is only meaningful once nothing can still move the table.
const regularPhaseIsOver = (matches: Match[]) => {
  const regular = matches.filter((match) => match.stage === 'regular')
  return regular.length > 0 && regular.every(isSettled)
}

// Fills in the participants a playoff match can already be derived from: the final
// standings once the regular phase is over, and the winners and losers of the earlier
// rounds as they are played. Derived at read time on purpose, so correcting a result
// corrects the bracket instead of leaving a stale team behind.
//
// An explicitly published participant always wins: if the organisation named a team,
// that is a decision, not a placeholder.
export function resolvePlayoffParticipants(matches: Match[], teams: Team[]): Match[] {
  const categories = [...new Set(matches.map((match) => match.category))]
  const resolved = new Map<string, Match>()

  categories.forEach((category) => {
    const own = matches.filter((match) => match.category === category)
    if (!regularPhaseIsOver(own)) return

    const standings = calculateStandings(
      category,
      teams.filter((team) => team.category === category),
      own,
      tournamentConfigs[category].scoring,
    )
    const byStage = new Map(own.map((match) => [match.stage, match]))

    // A later round reads the round before it, so resolving in bracket order lets one
    // pass carry a winner all the way through.
    Object.entries(brackets[category]).forEach(([stage, slots]) => {
      const match = byStage.get(stage as MatchStage)
      if (!match) return

      const teamFrom = (source: Source): string | undefined => {
        if (source.from === 'position') return standings[source.position - 1]?.team.id
        const previous = resolved.get(byStage.get(source.stage)?.id ?? '') ?? byStage.get(source.stage)
        if (!previous || !isSettled(previous) || previous.homeScore === previous.awayScore) return undefined
        const homeWon = previous.homeScore! > previous.awayScore!
        const wanted = source.from === 'winner' ? homeWon : !homeWon
        return wanted ? previous.homeTeamId : previous.awayTeamId
      }

      const homeTeamId = match.homeTeamId ?? teamFrom(slots.home)
      const awayTeamId = match.awayTeamId ?? teamFrom(slots.away)
      if (homeTeamId === match.homeTeamId && awayTeamId === match.awayTeamId) return
      resolved.set(match.id, { ...match, homeTeamId, awayTeamId })
    })
  })

  return resolved.size ? matches.map((match) => resolved.get(match.id) ?? match) : matches
}
