import type { PlayerStatistic, Team } from '../types/tournament'
import styles from './StatisticsTable.module.css'

// Players tied on points share a position, the way a leaderboard is read.
const positions = (rows: PlayerStatistic[]) => {
  let position = 0
  let previous: number | null = null
  return rows.map((row, index) => {
    if (row.points !== previous) { position = index + 1; previous = row.points }
    return position
  })
}

export function StatisticsTable({ rows, teams }: { rows: PlayerStatistic[]; teams: Team[] }) {
  const teamName = (id: string) => teams.find((team) => team.id === id)?.shortName ?? id
  if (!rows.length) return <div className={styles.empty}>Las estadísticas individuales se publicarán cuando estén disponibles.</div>

  // The leaderboard answers the question people arrive with. The full sheet is still
  // there, but a nine-column spreadsheet of everyone who dressed is not a front page.
  const scoring = rows.filter((row) => row.points > 0)
  const ranks = positions(scoring)

  return (
    <>
      {scoring.length > 0 && (
        <section className={styles.board} aria-labelledby="scorers-heading">
          <h3 id="scorers-heading">Goles y asistencias</h3>
          <p className={styles.rule}>Un gol y una asistencia valen un punto cada uno.</p>
          <ol className={styles.list}>
            {scoring.map((row, index) => (
              <li key={`${row.teamId}-${row.playerName}`}>
                <span className={styles.position}>{ranks[index]}</span>
                <span className={styles.who}>
                  <strong>{row.playerName}</strong>
                  <span className={styles.team}>{teamName(row.teamId)}</span>
                </span>
                <span className={styles.tally}>
                  {row.goals > 0 && `${row.goals} ${row.goals === 1 ? 'gol' : 'goles'}`}
                  {row.goals > 0 && row.assists > 0 && ' · '}
                  {row.assists > 0 && `${row.assists} ${row.assists === 1 ? 'asistencia' : 'asistencias'}`}
                </span>
                <span className={styles.points}>{row.points}</span>
              </li>
            ))}
          </ol>
        </section>
      )}

      <details className={styles.everyone}>
        <summary>Ver la planilla completa · {rows.length} jugadores</summary>
        <p className={styles.legend}>
          <b>PJ</b> partidos jugados · <b>G</b> goles · <b>A</b> asistencias · <b>PTS</b> puntos ·{' '}
          <b>F</b> faltas · <b>FG</b> faltas graves · <b>MIN</b> minutos de penalización
        </p>
        <div className={styles.wrap}>
          <table>
            <thead><tr><th>Jugador/a</th><th>Equipo</th><th>PJ</th><th>G</th><th>A</th><th>PTS</th><th>F</th><th>FG</th><th>MIN</th></tr></thead>
            <tbody>{rows.map((row) => (
              <tr key={`${row.teamId}-${row.playerName}`}>
                <th>{row.playerName}</th><td>{teamName(row.teamId)}</td><td>{row.played}</td><td>{row.goals}</td><td>{row.assists}</td><td><strong>{row.points}</strong></td><td>{row.penalties}</td><td>{row.majorPenalties}</td><td>{row.penaltyMinutes}</td>
              </tr>
            ))}</tbody>
          </table>
        </div>
      </details>
    </>
  )
}
