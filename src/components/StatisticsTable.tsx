import type { PlayerStatistic, Team } from '../types/tournament'
import styles from './StatisticsTable.module.css'

export function StatisticsTable({ rows, teams }: { rows: PlayerStatistic[]; teams: Team[] }) {
  const teamName = (id: string) => teams.find((team) => team.id === id)?.shortName ?? id
  if (!rows.length) return <div className={styles.empty}>Las estadísticas individuales se publicarán cuando estén disponibles.</div>

  return (
    <div className={styles.wrap}>
      <table>
        <thead><tr><th>Jugador/a</th><th>Equipo</th><th title="Goles">G</th><th title="Asistencias">A</th><th title="Faltas">F</th><th title="Faltas graves">FG</th><th title="Minutos de penalización">MIN</th></tr></thead>
        <tbody>{rows.map((row) => (
          <tr key={`${row.teamId}-${row.playerName}`}>
            <th>{row.playerName}</th><td>{teamName(row.teamId)}</td><td>{row.goals}</td><td>{row.assists}</td><td>{row.penalties}</td><td>{row.majorPenalties}</td><td>{row.penaltyMinutes}</td>
          </tr>
        ))}</tbody>
      </table>
    </div>
  )
}
