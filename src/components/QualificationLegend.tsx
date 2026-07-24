import type { QualificationBand } from '../types/tournament'
import styles from './QualificationLegend.module.css'

export function QualificationLegend({ bands }: { bands: QualificationBand[] }) {
  return (
    <ul className={styles.legend} aria-label="Clasificación a playoffs">
      {bands.map((band) => (
        <li key={`${band.from}-${band.label}`}>
          <span className={`${styles.dot} ${styles[band.tone]}`} />
          {band.from === band.to ? `${band.from}.º` : `${band.from}.º–${band.to}.º`} → {band.label}
        </li>
      ))}
    </ul>
  )
}
