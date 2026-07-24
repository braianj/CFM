import { stageLabels, statusLabels } from '../data/tournamentConfig'
import type { Match, Team } from '../types/tournament'
import { formatTime } from '../utils/date'
import styles from './MatchCard.module.css'

interface Props {
  match: Match
  teams: Team[]
  timezone: string
  categoryLabel?: string
}

export function MatchCard({ match, teams, timezone, categoryLabel }: Props) {
  const findTeam = (id?: string) => teams.find((team) => team.id === id)
  const home = findTeam(match.homeTeamId)
  const away = findTeam(match.awayTeamId)
  const hasScore = match.homeScore !== null && match.awayScore !== null

  return (
    <article
      id={`match-${match.id}`}
      className={`${styles.card} ${styles[match.status]}`}
      aria-label={`${home?.name ?? match.homeLabel} contra ${away?.name ?? match.awayLabel}`}
    >
      <div className={styles.meta}>
        <time dateTime={match.startDateTime}>{formatTime(match.startDateTime, timezone)}</time>
        <span>{categoryLabel ? `${categoryLabel} · ${stageLabels[match.stage]}` : stageLabels[match.stage]}</span>
        <span className={styles.status}>{statusLabels[match.status]}</span>
      </div>
      <div className={styles.teams}>
        <TeamRow team={home} label={match.homeLabel} score={hasScore ? match.homeScore : null} />
        <TeamRow team={away} label={match.awayLabel} score={hasScore ? match.awayScore : null} />
      </div>
      {(match.venue || match.notes) && (
        <footer className={styles.footer}>
          {match.venue && <span>{match.venue}</span>}
          {match.notes && <strong>{match.notes}</strong>}
        </footer>
      )}
    </article>
  )
}

function TeamRow({ team, label, score }: { team?: Team; label?: string; score: number | null }) {
  return (
    <div className={styles.team}>
      <span className={styles.marker} style={{ backgroundColor: team?.color ?? '#8b98a6' }} />
      <span className={team ? styles.teamName : styles.placeholder}>{team?.name ?? label ?? 'A confirmar'}</span>
      <span className={styles.score}>{score ?? '—'}</span>
    </div>
  )
}
