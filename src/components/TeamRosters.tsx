import { tournamentConfigs } from '../data/tournamentConfig'
import type { Player, Team } from '../types/tournament'
import styles from './TeamRosters.module.css'

interface Props {
  teams: Team[]
  players: Player[]
  showCategory: boolean
}

export function TeamRosters({ teams, players, showCategory }: Props) {
  if (!teams.length) {
    return <div className={styles.empty}>No hay equipos para esta selección.</div>
  }

  return (
    <div className={styles.rosters}>
      {teams.map((team) => {
        const squad = players.filter((player) => player.teamId === team.id && player.active)

        return (
          <section className={styles.team} key={team.id} aria-labelledby={`roster-${team.id}`}>
            <header className={styles.heading}>
              <span className={styles.marker} style={{ backgroundColor: team.color ?? '#8b98a6' }} />
              <div>
                <h2 id={`roster-${team.id}`}>{team.name}</h2>
                {showCategory && <p>{tournamentConfigs[team.category].name}</p>}
              </div>
              <span className={styles.count}>{squad.length}</span>
            </header>
            {squad.length ? (
              <ul className={styles.squad}>
                {squad.map((player) => <li key={player.id}>{player.name}</li>)}
              </ul>
            ) : (
              <p className={styles.pending}>El plantel todavía no fue publicado.</p>
            )}
          </section>
        )
      })}
    </div>
  )
}
