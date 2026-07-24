import { useMemo, useState } from 'react'
import { MatchTimeline } from './components/MatchTimeline'
import { PlayoffBracket } from './components/PlayoffBracket'
import { SegmentedControl } from './components/SegmentedControl'
import { StandingsTable } from './components/StandingsTable'
import { StatisticsTable } from './components/StatisticsTable'
import { getTeamsByCategory, teams } from './data/teams'
import { tournamentConfigs } from './data/tournamentConfig'
import { useTournamentData } from './hooks/useTournamentData'
import type { Category } from './types/tournament'
import { calculatePlayerStatistics } from './utils/statistics'
import { calculateStandings } from './utils/standings'
import styles from './styles/App.module.css'

type View = 'matches' | 'standings' | 'statistics'
const readStored = <T extends string>(key: string, allowed: T[], fallback: T): T => {
  const value = localStorage.getItem(key)
  return allowed.includes(value as T) ? (value as T) : fallback
}

export default function App() {
  const [category, setCategoryState] = useState<Category>(() => readStored('cfm-category', ['men', 'women'], 'men'))
  const [view, setViewState] = useState<View>(() => readStored('cfm-view', ['matches', 'standings', 'statistics'], 'matches'))
  const { matches, events, usingLiveData } = useTournamentData()
  const config = tournamentConfigs[category]
  const categoryTeams = getTeamsByCategory(category)
  const categoryMatches = useMemo(() => matches.filter((match) => match.category === category), [category, matches])
  const standings = useMemo(
    () => calculateStandings(category, teams, categoryMatches, config.scoring),
    [category, categoryMatches, config.scoring],
  )
  const statistics = useMemo(() => calculatePlayerStatistics(category, events), [category, events])

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
          <div><span>Ushuaia · 2026</span><h1>CFM Ushuaia Hockey</h1></div>
        </div>
        <SegmentedControl label="Torneo" value={category} onChange={setCategory} options={[
          { value: 'men', label: 'Masculino' }, { value: 'women', label: 'Femenino' },
        ]} />
        <SegmentedControl label="Vista" value={view} onChange={setView} options={[
          { value: 'matches', label: 'Partidos' }, { value: 'standings', label: 'Posiciones' },
          { value: 'statistics', label: 'Estadísticas' },
        ]} />
      </header>
      <main className={styles.main}>
        <div className={styles.title}>
          <div><span className={category === 'men' ? styles.men : styles.women} />{config.name}</div>
          <p>{view === 'matches' ? 'Calendario y resultados' : view === 'standings' ? 'Tabla calculada desde los resultados' : 'Goles, asistencias y faltas'}</p>
        </div>
        {view === 'matches' ? (
          <MatchTimeline matches={categoryMatches} teams={categoryTeams} timezone={config.timezone} scrollKey={category} />
        ) : view === 'standings' ? (
          <>
            <StandingsTable rows={standings} bands={config.qualification} />
            <PlayoffBracket category={category} matches={categoryMatches} teams={categoryTeams} />
          </>
        ) : <StatisticsTable rows={statistics} teams={categoryTeams} />}
      </main>
      <footer className={styles.siteFooter}>Horarios de Ushuaia (UTC−3) · {usingLiveData ? 'Datos publicados desde la organización' : 'Datos iniciales del torneo'}</footer>
    </>
  )
}
