import type { Team } from '../types/tournament'
import { ALL_TEAMS } from '../utils/matches'
import styles from './TeamFilter.module.css'

interface Props {
  teams: Team[]
  value: string
  onChange: (value: string) => void
}

export function TeamFilter({ teams, value, onChange }: Props) {
  return (
    <label className={styles.filter}>
      <span>Equipo</span>
      <select value={value} onChange={(event) => onChange(event.target.value)}>
        <option value={ALL_TEAMS}>Todos los equipos</option>
        {teams.map((team) => (
          <option key={team.id} value={team.id}>{team.name}</option>
        ))}
      </select>
    </label>
  )
}
