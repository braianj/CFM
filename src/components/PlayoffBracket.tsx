import { stageLabels, statusLabels } from '../data/tournamentConfig'
import type { Category, Match, MatchStage, Team } from '../types/tournament'
import styles from './PlayoffBracket.module.css'

interface Props {
  category: Category
  matches: Match[]
  teams: Team[]
}

const stageOrder: Record<Category, MatchStage[][]> = {
  men: [['semifinal-a', 'semifinal-b'], ['final-a', 'final-b']],
  women: [['final']],
}

export function PlayoffBracket({ category, matches, teams }: Props) {
  const playoffMatches = matches.filter((match) => match.stage !== 'regular')
  const teamName = (id?: string) => teams.find((team) => team.id === id)?.name

  return (
    <section className={styles.section} aria-labelledby="playoffs-heading">
      <div className={styles.heading}>
        <p>Definición</p>
        <h2 id="playoffs-heading">Llave de finales</h2>
      </div>
      <div className={`${styles.bracket} ${category === 'women' ? styles.single : ''}`}>
        {stageOrder[category].map((column, index) => (
          <div className={styles.round} key={column.join('-')}>
            <span className={styles.roundLabel}>
              {category === 'men' && index === 0 ? 'Semifinales' : 'Finales'}
            </span>
            <div className={styles.games}>
              {column.map((stage) => {
                const match = playoffMatches.find((candidate) => candidate.stage === stage)
                if (!match) return null
                return (
                  <article className={styles.game} key={match.id}>
                    <header>
                      <strong>{stageLabels[match.stage]}</strong>
                      <span>{statusLabels[match.status]}</span>
                    </header>
                    <Participant
                      label={teamName(match.homeTeamId) ?? match.homeLabel ?? 'A confirmar'}
                      score={match.homeScore}
                    />
                    <Participant
                      label={teamName(match.awayTeamId) ?? match.awayLabel ?? 'A confirmar'}
                      score={match.awayScore}
                    />
                  </article>
                )
              })}
            </div>
          </div>
        ))}
      </div>
      <p className={styles.note}>
        Los participantes pendientes se reemplazan en <code>src/data/matches.ts</code>.
      </p>
    </section>
  )
}

function Participant({ label, score }: { label: string; score: number | null }) {
  return (
    <div className={styles.participant}>
      <span>{label}</span>
      <strong>{score ?? '—'}</strong>
    </div>
  )
}
