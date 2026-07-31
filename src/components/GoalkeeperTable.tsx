import type { Team } from '../types/tournament'
import type { GoalkeeperStatistic } from '../utils/goalkeepers'
import styles from './GoalkeeperTable.module.css'

const percentage = (value: number | null) => (value === null ? '—' : `${Math.round(value * 1000) / 10}%`)

export function GoalkeeperTable({ rows, teams }: { rows: GoalkeeperStatistic[]; teams: Team[] }) {
  if (!rows.length) return null
  const teamName = (id: string) => teams.find((team) => team.id === id)?.shortName ?? id

  return (
    <section className={styles.board} aria-labelledby="goalkeepers-heading">
      <h3 id="goalkeepers-heading">Arqueros</h3>
      <p className={styles.rule}>
        Tiros al arco son las atajadas más los goles recibidos. El porcentaje es
        atajadas sobre tiros al arco.
      </p>
      <div className={styles.wrap}>
        <table>
          <thead>
            <tr>
              <th>Arquero/a</th><th>Equipo</th><th>PJ</th><th>MIN</th>
              <th>TIROS</th><th>ATAJ</th><th>GC</th><th>%</th>
            </tr>
          </thead>
          <tbody>{rows.map((row) => (
            <tr key={`${row.teamId}-${row.playerName}`}>
              <th>{row.playerName}</th>
              <td>{teamName(row.teamId)}</td>
              <td>{row.played}</td>
              <td>{row.minutes || '—'}</td>
              <td>{row.shotsOnTarget}</td>
              <td>{row.saves}</td>
              <td>{row.goalsAgainst}</td>
              <td><strong>{percentage(row.savePercentage)}</strong></td>
            </tr>
          ))}</tbody>
        </table>
      </div>
      <p className={styles.legend}>
        <b>PJ</b> partidos · <b>MIN</b> minutos jugados · <b>TIROS</b> tiros al arco ·{' '}
        <b>ATAJ</b> atajadas · <b>GC</b> goles recibidos
      </p>
    </section>
  )
}
