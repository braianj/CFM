import { eventTypeLabels } from '../data/tournamentConfig'
import type { Team } from '../types/tournament'
import type { MatchSummaryLine } from '../utils/matchSummary'
import styles from './MatchSummary.module.css'

interface Props {
  lines: MatchSummaryLine[]
  teams: Team[]
}

export function MatchSummary({ lines, teams }: Props) {
  return (
    <ol className={styles.summary}>
      {lines.map((line) => (
        <li key={line.id} className={`${styles.line} ${line.missing.length ? styles.pending : ''}`}>
          <span className={styles.clock}>
            <span className={styles.period}>{line.period ? `P${line.period}` : ''}</span>
            <span className={styles.time}>{line.elapsed ?? ''}</span>
          </span>
          <span
            className={styles.marker}
            style={{ backgroundColor: teams.find((team) => team.id === line.teamId)?.color ?? 'var(--border-strong)' }}
          />
          <span className={styles.detail}>
            <span className={styles.headline}>
              <span className={`${styles.kind} ${line.type === 'goal' ? styles.goal : styles.penalty}`}>
                {eventTypeLabels[line.type]}
                {line.penaltyMinutes ? ` ${line.penaltyMinutes}'` : ''}
              </span>
              <strong>{line.player}</strong>
            </span>
            <span className={styles.team}>
              {line.teamName}
              {line.assists.length > 0 &&
                ` · Asistencia${line.assists.length > 1 ? 's' : ''}: ${line.assists.join(', ')}`}
            </span>
          </span>
        </li>
      ))}
    </ol>
  )
}
