import { tournamentConfigs } from '../data/tournamentConfig'
import type { Category, Team } from '../types/tournament'
import { ALL_TEAMS } from '../utils/matches'
import styles from './TeamFilter.module.css'

interface Props {
  teams: Team[]
  value: string
  onChange: (value: string) => void
}

const categoriesOf = (teams: Team[]) =>
  (['men', 'women'] as Category[]).filter((category) => teams.some((team) => team.category === category))

export function TeamFilter({ teams, value, onChange }: Props) {
  const categories = categoriesOf(teams)

  return (
    <label className={styles.filter}>
      <span>Equipo</span>
      <select value={value} onChange={(event) => onChange(event.target.value)}>
        <option value={ALL_TEAMS}>Todos los equipos</option>
        {categories.length > 1
          ? categories.map((category) => (
              <optgroup key={category} label={tournamentConfigs[category].name}>
                {teams
                  .filter((team) => team.category === category)
                  .map((team) => <option key={team.id} value={team.id}>{team.name}</option>)}
              </optgroup>
            ))
          : teams.map((team) => <option key={team.id} value={team.id}>{team.name}</option>)}
      </select>
    </label>
  )
}
