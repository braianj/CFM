import { useState } from 'react'
import { stageLabels, statusLabels } from '../data/tournamentConfig'
import type { Match, MatchResolution, Team } from '../types/tournament'
import { formatTime } from '../utils/date'
import type { MatchSummaryLine } from '../utils/matchSummary'
import { MatchSummary } from './MatchSummary'
import styles from './MatchCard.module.css'

interface Props {
  match: Match
  teams: Team[]
  timezone: string
  categoryLabel?: string
  summary?: MatchSummaryLine[]
}

const resolutionLabels: Record<MatchResolution, string> = {
  regulation: '',
  overtime: 'Definido en tiempo extra',
  shootout: 'Definido por penales',
}

export function MatchCard({ match, teams, timezone, categoryLabel, summary = [] }: Props) {
  const [open, setOpen] = useState(false)
  const findTeam = (id?: string) => teams.find((team) => team.id === id)
  const home = findTeam(match.homeTeamId)
  const away = findTeam(match.awayTeamId)
  const hasScore = match.homeScore !== null && match.awayScore !== null
  const resolutionLabel = match.resolution ? resolutionLabels[match.resolution] : undefined
  // Only a match with published events has something to unfold.
  const expandable = summary.length > 0
  const summaryId = `match-${match.id}-summary`

  const head = (
    <>
      <span className={styles.meta}>
        <time dateTime={match.startDateTime}>{formatTime(match.startDateTime, timezone)}</time>
        <span className={styles.stage}>
          {categoryLabel ? `${categoryLabel} · ${stageLabels[match.stage]}` : stageLabels[match.stage]}
        </span>
        <span className={styles.status}>{statusLabels[match.status]}</span>
        {expandable && <Chevron open={open} />}
      </span>
      <span className={styles.teams}>
        <TeamRow team={home} label={match.homeLabel} score={hasScore ? match.homeScore : null} />
        <TeamRow team={away} label={match.awayLabel} score={hasScore ? match.awayScore : null} />
      </span>
    </>
  )

  return (
    <article
      id={`match-${match.id}`}
      className={`${styles.card} ${styles[match.status]}`}
      aria-label={`${home?.name ?? match.homeLabel} contra ${away?.name ?? match.awayLabel}`}
    >
      {expandable ? (
        <button
          type="button"
          className={styles.head}
          aria-expanded={open}
          aria-controls={summaryId}
          onClick={() => setOpen((current) => !current)}
        >
          {head}
        </button>
      ) : (
        <div className={styles.head}>{head}</div>
      )}
      {expandable && (
        <div id={summaryId} className={styles.summary} hidden={!open}>
          <MatchSummary lines={summary} teams={teams} />
        </div>
      )}
      {(match.venue || match.notes || resolutionLabel) && (
        <footer className={styles.footer}>
          {resolutionLabel && <span>{resolutionLabel}</span>}
          {match.venue && <span>{match.venue}</span>}
          {match.notes && <strong>{match.notes}</strong>}
        </footer>
      )}
    </article>
  )
}

function TeamRow({ team, label, score }: { team?: Team; label?: string; score: number | null }) {
  return (
    <span className={styles.team}>
      <span className={styles.marker} style={{ backgroundColor: team?.color ?? '#8b98a6' }} />
      <span className={team ? styles.teamName : styles.placeholder}>{team?.name ?? label ?? 'A confirmar'}</span>
      <span className={styles.score}>{score ?? '—'}</span>
    </span>
  )
}

function Chevron({ open }: { open: boolean }) {
  return (
    <svg className={`${styles.chevron} ${open ? styles.chevronOpen : ''}`} viewBox="0 0 16 16" aria-hidden="true">
      <path d="M4 6l4 4 4-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}
