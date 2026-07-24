import type { QualificationBand, StandingRow } from '../types/tournament'
import { QualificationLegend } from './QualificationLegend'
import styles from './StandingsTable.module.css'

const qualificationFor = (position: number, bands: QualificationBand[]) =>
  bands.find((band) => position >= band.from && position <= band.to)

export function StandingsTable({ rows, bands }: { rows: StandingRow[]; bands: QualificationBand[] }) {
  return (
    <section aria-labelledby="standings-heading">
      <div className={styles.heading}>
        <div>
          <p>Fase regular</p>
          <h2 id="standings-heading">Posiciones</h2>
        </div>
        <span>3 · 2 · 1 · 0 pts</span>
      </div>
      <QualificationLegend bands={bands} />
      <div className={styles.scroller} tabIndex={0} aria-label="Tabla de posiciones; deslizá horizontalmente para ver todas las columnas">
        <table>
          <thead><tr><th>Pos.</th><th>Equipo</th><th>GP</th><th title="Ganados">G</th><th title="Ganados en tiempo extra">GOT</th><th title="Perdidos en tiempo extra">POT</th><th title="Perdidos">P</th><th>GF</th><th>GC</th><th>DG</th><th>Pts.</th></tr></thead>
          <tbody>
            {rows.map((row) => {
              const band = qualificationFor(row.position, bands)
              return (
                <tr key={row.team.id} className={band ? styles[band.tone] : undefined}>
                  <td><span className={styles.position}>{row.position}</span></td>
                  <th scope="row">{row.team.name}</th>
                  <td>{row.played}</td><td>{row.won}</td><td>{row.overtimeWon}</td><td>{row.overtimeLost}</td><td>{row.lost}</td>
                  <td>{row.goalsFor}</td><td>{row.goalsAgainst}</td>
                  <td>{row.goalDifference > 0 ? `+${row.goalDifference}` : row.goalDifference}</td>
                  <td className={styles.points}>{row.points}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
      <p className={styles.help}>
        GP: jugados · G: ganados (3 pts) · GOT: ganados en tiempo extra (2 pts) ·
        POT: perdidos en tiempo extra (1 pt) · P: perdidos (0 pts) · DG: diferencia de gol
      </p>
    </section>
  )
}
