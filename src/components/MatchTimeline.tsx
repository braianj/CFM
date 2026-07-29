import { useEffect } from 'react'
import { tournamentConfigs } from '../data/tournamentConfig'
import type { Match, MatchEvent, MatchRosterEntry, Team } from '../types/tournament'
import { formatDay } from '../utils/date'
import { getInitialMatchId, groupMatchesByDay } from '../utils/matches'
import { buildMatchSummary } from '../utils/matchSummary'
import { MatchCard } from './MatchCard'
import styles from './MatchTimeline.module.css'

interface Props {
  matches: Match[]
  teams: Team[]
  timezone: string
  scrollKey: string
  showCategory?: boolean
  events?: MatchEvent[]
  rosters?: MatchRosterEntry[]
}

export function MatchTimeline({ matches, teams, timezone, scrollKey, showCategory = false, events = [], rosters = [] }: Props) {
  const groups = groupMatchesByDay(matches, timezone)

  useEffect(() => {
    const targetId = getInitialMatchId(matches)
    if (!targetId) return
    const frame = requestAnimationFrame(() => {
      document.getElementById(`match-${targetId}`)?.scrollIntoView({ block: 'center', behavior: 'smooth' })
    })
    return () => cancelAnimationFrame(frame)
    // scrollKey intentionally makes this run once when the selected tournament changes.
  }, [scrollKey, matches])

  if (!groups.length) {
    return <div className={styles.empty}>No hay partidos programados para esta selección.</div>
  }

  return (
    <div className={styles.timeline}>
      {groups.map((group) => (
        <section key={group.date} className={styles.day} aria-labelledby={`day-${group.date}`}>
          <h2 id={`day-${group.date}`}>{formatDay(group.matches[0].startDateTime, timezone)}</h2>
          <div className={styles.line}>
            {group.matches.map((match) => (
              <MatchCard
                key={match.id}
                match={match}
                teams={teams}
                timezone={timezone}
                categoryLabel={showCategory ? tournamentConfigs[match.category].shortName : undefined}
                summary={buildMatchSummary(match.id, events, teams, rosters)}
              />
            ))}
          </div>
        </section>
      ))}
    </div>
  )
}
