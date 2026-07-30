import { TIMEZONE, tournamentConfigs } from '../data/tournamentConfig'
import type { Match, MatchEvent, MatchRosterEntry, Player, PlayerRole, Team } from '../types/tournament'
import { formatShortDay } from '../utils/date'
import { buildPlayerRecord, type PlayerActionType } from '../utils/playerRecord'
import styles from './PlayerCard.module.css'

interface Props {
  player: Player
  team?: Team
  teams: Team[]
  matches: Match[]
  rosters: MatchRosterEntry[]
  events: MatchEvent[]
  onBack: () => void
}

const roleLabels: Record<PlayerRole, string> = {
  C: 'Capitán/a',
  A: 'Asistente',
  GK: 'Arquero/a',
}

const actionLabels: Record<PlayerActionType, string> = {
  goal: 'Gol',
  assist: 'Asistencia',
  penalty: 'Falta',
  'major-penalty': 'Falta grave',
}

export function PlayerCard({ player, team, teams, matches, rosters, events, onBack }: Props) {
  const record = buildPlayerRecord(player, matches, teams, rosters, events)

  return (
    <div className={styles.card}>
      <button type="button" className={styles.back} onClick={onBack}>‹ Volver al plantel</button>
      <header className={styles.head}>
        <span className={styles.marker} style={{ backgroundColor: team?.color ?? '#8b98a6' }} />
        <div>
          <h2>{player.name}</h2>
          <p>
            {team?.name ?? ''}
            {player.role ? ` · ${roleLabels[player.role]}` : ''}
            {` · ${tournamentConfigs[player.category].name}`}
          </p>
        </div>
      </header>

      <dl className={styles.totals}>
        <div><dt>Partidos</dt><dd>{record.played}</dd></div>
        <div><dt>Goles</dt><dd>{record.goals}</dd></div>
        <div><dt>Asistencias</dt><dd>{record.assists}</dd></div>
        <div className={styles.highlight}><dt>Puntos</dt><dd>{record.points}</dd></div>
        <div><dt>Faltas</dt><dd>{record.penalties}</dd></div>
        <div><dt>Minutos</dt><dd>{record.penaltyMinutes}</dd></div>
      </dl>

      {record.matches.length === 0 ? (
        <p className={styles.empty}>Todavía no jugó ningún partido.</p>
      ) : (
        <ol className={styles.matches}>
          {record.matches.map((item) => (
            <li key={item.matchId}>
              <div className={styles.matchHead}>
                <strong>vs {item.opponent}</strong>
                <span>
                  {formatShortDay(item.startDateTime, TIMEZONE)}
                  {item.jerseyNumber !== undefined ? ` · #${item.jerseyNumber}` : ''}
                </span>
              </div>
              {item.actions.length === 0 ? (
                <p className={styles.quiet}>Jugó, sin goles ni faltas.</p>
              ) : (
                <ul className={styles.actions}>
                  {item.actions.map((action) => (
                    <li key={action.id}>
                      <span className={`${styles.tag} ${styles[action.type === 'assist' || action.type === 'goal' ? 'scoring' : 'penalising']}`}>
                        {actionLabels[action.type]}
                        {action.penaltyMinutes ? ` ${action.penaltyMinutes}'` : ''}
                      </span>
                      <span className={styles.when}>
                        {action.period ? `P${action.period}` : ''} {action.elapsed ?? ''}
                      </span>
                      {action.withPlayer && (
                        <span className={styles.with}>
                          {action.type === 'goal' ? 'asistió ' : 'gol de '}{action.withPlayer}
                        </span>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </li>
          ))}
        </ol>
      )}
    </div>
  )
}
