import { MINORS_FOR_EJECTION, MINUTES_FOR_SUSPENSION, type PlayerDiscipline } from '../utils/discipline'
import type { Team } from '../types/tournament'
import styles from './DisciplineNotice.module.css'

interface Props {
  rows: PlayerDiscipline[]
  teams: Team[]
}

export function DisciplineNotice({ rows, teams }: Props) {
  if (!rows.length) return null

  const teamName = (id: string) => teams.find((team) => team.id === id)?.shortName ?? id

  return (
    <section className={styles.notice} aria-labelledby="discipline-heading">
      <h3 id="discipline-heading">Sanciones</h3>
      <p className={styles.rule}>
        {MINORS_FOR_EJECTION} faltas menores en un partido es expulsión y una fecha de suspensión.
        Acumular {MINUTES_FOR_SUSPENSION} minutos de penalización en el torneo también cuesta una fecha.
      </p>
      <ul className={styles.list}>
        {rows.map((row) => (
          <li key={`${row.teamId}-${row.playerName}`}>
            <span><strong>{row.playerName}</strong> · {teamName(row.teamId)}</span>
            <span className={styles.reasons}>
              {row.reasons.includes('three-minors') && (
                <em className={styles.tag}>
                  Expulsado por {MINORS_FOR_EJECTION} menores
                  {row.ejectedFrom.length > 1 ? ` en ${row.ejectedFrom.length} partidos` : ''}
                </em>
              )}
              {row.reasons.includes('penalty-minutes') && (
                <em className={styles.tag}>Acumula {row.penaltyMinutes} minutos</em>
              )}
              <em className={styles.consequence}>pierde una fecha</em>
            </span>
          </li>
        ))}
      </ul>
    </section>
  )
}
