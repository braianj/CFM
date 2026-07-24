import { useMemo, useState } from 'react'
import { MatchTimeline } from './components/MatchTimeline'
import { PlayoffBracket } from './components/PlayoffBracket'
import { SegmentedControl } from './components/SegmentedControl'
import { StandingsTable } from './components/StandingsTable'
import { getMatchesByCategory } from './data/matches'
import { getTeamsByCategory, teams } from './data/teams'
import { tournamentConfigs } from './data/tournamentConfig'
import type { Category } from './types/tournament'
import { calculateStandings } from './utils/standings'
import styles from './styles/App.module.css'

type View = 'matches' | 'standings'
const readStored = <T extends string>(key: string, allowed: T[], fallback: T): T => {
  const value = localStorage.getItem(key)
  return allowed.includes(value as T) ? (value as T) : fallback
}

export default function App() {
  const [category, setCategoryState] = useState<Category>(() => readStored('cfm-category', ['men', 'women'], 'men'))
  const [view, setViewState] = useState<View>(() => readStored('cfm-view', ['matches', 'standings'], 'matches'))
  const config = tournamentConfigs[category]
  const categoryTeams = getTeamsByCategory(category)
  const categoryMatches = useMemo(() => getMatchesByCategory(category), [category])
  const standings = useMemo(
    () => calculateStandings(category, teams, categoryMatches, config.scoring),
    [category, categoryMatches, config.scoring],
  )

  const setCategory = (next: Category) => {
    localStorage.setItem('cfm-category', next)
    setCategoryState(next)
  }
  const setView = (next: View) => {
    localStorage.setItem('cfm-view', next)
    setViewState(next)
  }

  return (
    <>
      <header className={styles.header}>
        <div className={styles.brand}>
          <div className={styles.puck} aria-hidden="true">CFM</div>
          <div><span>Ushuaia · 2026</span><h1>Hockey sobre hielo</h1></div>
        </div>
        <SegmentedControl label="Torneo" value={category} onChange={setCategory} options={[
          { value: 'men', label: 'Masculino' }, { value: 'women', label: 'Femenino' },
        ]} />
        <SegmentedControl label="Vista" value={view} onChange={setView} options={[
          { value: 'matches', label: 'Partidos' }, { value: 'standings', label: 'Posiciones' },
        ]} />
      </header>
      <main className={styles.main}>
        <div className={styles.title}>
          <div><span className={category === 'men' ? styles.men : styles.women} />{config.name}</div>
          <p>{view === 'matches' ? 'Calendario y resultados' : 'Tabla calculada desde los resultados'}</p>
        </div>
        {view === 'matches' ? (
          <MatchTimeline matches={categoryMatches} teams={categoryTeams} timezone={config.timezone} scrollKey={category} />
        ) : (
          <>
            <StandingsTable rows={standings} bands={config.qualification} />
            <PlayoffBracket category={category} matches={categoryMatches} teams={categoryTeams} />
          </>
        )}
      </main>
      <footer className={styles.siteFooter}>Horarios de Ushuaia (UTC−3) · Datos actualizados manualmente</footer>
    </>
  )
}
