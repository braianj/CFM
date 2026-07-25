import { useMemo, useState } from 'react'
import { track } from './analytics'
import { MatchTimeline } from './components/MatchTimeline'
import { PlayoffBracket } from './components/PlayoffBracket'
import { SegmentedControl } from './components/SegmentedControl'
import { StandingsTable } from './components/StandingsTable'
import { StatisticsTable } from './components/StatisticsTable'
import { DisciplineNotice } from './components/DisciplineNotice'
import { TeamFilter } from './components/TeamFilter'
import { TeamRosters } from './components/TeamRosters'
import { players as officialPlayers } from './data/players'
import { TIMEZONE, tournamentConfigs } from './data/tournamentConfig'
import { useTournamentData } from './hooks/useTournamentData'
import type { Category, Match, MatchEvent, MatchRosterEntry, Team } from './types/tournament'
import { ALL_TEAMS, filterMatchesByTeam } from './utils/matches'
import { mergeRosters } from './utils/rosters'
import { calculateDiscipline } from './utils/discipline'
import { calculatePlayerStatistics } from './utils/statistics'
import { calculateStandings } from './utils/standings'
import styles from './styles/App.module.css'

type View = 'matches' | 'rosters' | 'standings' | 'statistics'
type Scope = Category | 'all'

const scopeCategories: Record<Scope, Category[]> = {
  all: ['men', 'women'],
  men: ['men'],
  women: ['women'],
}

const scopeLabels: Record<Scope, string> = {
  all: 'Todo el torneo',
  men: 'Torneo Masculino',
  women: 'Torneo Femenino',
}

const viewSubtitles: Record<View, string> = {
  matches: 'Calendario y resultados',
  rosters: 'Jugadores inscriptos por equipo',
  standings: 'Tabla calculada desde los resultados',
  statistics: 'Goles, asistencias y faltas',
}

const readStored = <T extends string>(key: string, allowed: T[], fallback: T): T => {
  const value = localStorage.getItem(key)
  return allowed.includes(value as T) ? (value as T) : fallback
}

export default function App() {
  const [scope, setScopeState] = useState<Scope>(() => readStored('cfm-category', ['all', 'men', 'women'], 'all'))
  const [view, setViewState] = useState<View>(() => readStored('cfm-view', ['matches', 'rosters', 'standings', 'statistics'], 'matches'))
  const [teamId, setTeamIdState] = useState(() => localStorage.getItem('cfm-team') ?? ALL_TEAMS)
  const { matches, teams, players, rosters, events, usingLiveData } = useTournamentData()

  const rosterPlayers = useMemo(() => mergeRosters(officialPlayers, players), [players])
  const categories = scopeCategories[scope]
  const scopedTeams = useMemo(() => teams.filter((team) => categories.includes(team.category)), [categories, teams])
  const scopedMatches = useMemo(() => matches.filter((match) => categories.includes(match.category)), [categories, matches])
  const selectedTeam = scopedTeams.find((team) => team.id === teamId)
  // Picking a team narrows the listing to its own tournament, never the other one.
  const listedMatches = useMemo(
    () =>
      selectedTeam
        ? filterMatchesByTeam(
            scopedMatches.filter((match) => match.category === selectedTeam.category),
            selectedTeam.id,
          )
        : scopedMatches,
    [scopedMatches, selectedTeam],
  )

  const setTeamId = (next: string) => {
    localStorage.setItem('cfm-team', next)
    setTeamIdState(next)
    const team = scopedTeams.find((candidate) => candidate.id === next)
    void track('select_team', team
      ? { team_id: team.id, team_name: team.name, category: team.category }
      : { team_id: ALL_TEAMS })
  }
  const setScope = (next: Scope) => {
    localStorage.setItem('cfm-category', next)
    setScopeState(next)
    localStorage.setItem('cfm-team', ALL_TEAMS)
    setTeamIdState(ALL_TEAMS)
    void track('select_tournament', { tournament: next })
  }
  const setView = (next: View) => {
    localStorage.setItem('cfm-view', next)
    setViewState(next)
    void track('select_view', { view: next, tournament: scope })
  }

  return (
    <>
      <header className={styles.header}>
        <div className={styles.brand}>
          <div className={styles.puck} aria-hidden="true">CFM</div>
          <div><span>Ushuaia · 2026</span><h1>CFM Ushuaia Hockey</h1></div>
        </div>
        <SegmentedControl label="Torneo" value={scope} onChange={setScope} options={[
          { value: 'all', label: 'Todos' }, { value: 'men', label: 'Masculino' }, { value: 'women', label: 'Femenino' },
        ]} />
        <SegmentedControl label="Vista" value={view} onChange={setView} options={[
          { value: 'matches', label: 'Partidos' }, { value: 'rosters', label: 'Planteles' },
          { value: 'standings', label: 'Posiciones' }, { value: 'statistics', label: 'Estadísticas' },
        ]} />
      </header>
      <main className={styles.main}>
        <div className={styles.title}>
          <div>
            {categories.map((category) => (
              <span key={category} className={category === 'men' ? styles.men : styles.women} />
            ))}
            {scopeLabels[scope]}
          </div>
          <p>{viewSubtitles[view]}</p>
        </div>
        {view === 'matches' ? (
          <>
            <TeamFilter teams={scopedTeams} value={selectedTeam?.id ?? ALL_TEAMS} onChange={setTeamId} />
            <MatchTimeline
              matches={listedMatches}
              teams={scopedTeams}
              timezone={TIMEZONE}
              showCategory={categories.length > 1}
              scrollKey={`${scope}-${selectedTeam?.id ?? ALL_TEAMS}`}
            />
          </>
        ) : view === 'rosters' ? (
          <>
            <TeamFilter teams={scopedTeams} value={selectedTeam?.id ?? ALL_TEAMS} onChange={setTeamId} />
            <TeamRosters
              teams={selectedTeam ? [selectedTeam] : scopedTeams}
              players={rosterPlayers}
              showCategory={categories.length > 1}
            />
          </>
        ) : view === 'standings' ? (
          categories.map((category) => (
            <StandingsSection
              key={category}
              category={category}
              teams={teams}
              matches={matches}
              showHeading={categories.length > 1}
            />
          ))
        ) : (
          categories.map((category) => (
            <StatisticsSection
              key={category}
              category={category}
              teams={teams}
              events={events}
              rosters={rosters}
              showHeading={categories.length > 1}
            />
          ))
        )}
      </main>
      <footer className={styles.siteFooter}>Horarios de Ushuaia (UTC−3) · {usingLiveData ? 'Datos publicados desde la organización' : 'Datos iniciales del torneo'}</footer>
    </>
  )
}

interface SectionProps {
  category: Category
  teams: Team[]
  showHeading: boolean
}

function StandingsSection({ category, teams, matches, showHeading }: SectionProps & { matches: Match[] }) {
  const config = tournamentConfigs[category]
  const categoryTeams = teams.filter((team) => team.category === category)
  const categoryMatches = matches.filter((match) => match.category === category)
  const rows = calculateStandings(category, categoryTeams, categoryMatches, config.scoring)

  return (
    <section className={styles.tournamentSection}>
      {showHeading && <h2 className={styles.tournamentHeading}>{config.name}</h2>}
      <StandingsTable rows={rows} bands={config.qualification} />
      <PlayoffBracket category={category} matches={categoryMatches} teams={categoryTeams} />
    </section>
  )
}

function StatisticsSection({ category, teams, events, rosters, showHeading }: SectionProps & { events: MatchEvent[]; rosters: MatchRosterEntry[] }) {
  const categoryTeams = teams.filter((team) => team.category === category)

  return (
    <section className={styles.tournamentSection}>
      {showHeading && <h2 className={styles.tournamentHeading}>{tournamentConfigs[category].name}</h2>}
      <StatisticsTable rows={calculatePlayerStatistics(category, events, rosters)} teams={categoryTeams} />
      <DisciplineNotice rows={calculateDiscipline(category, events)} teams={categoryTeams} />
    </section>
  )
}
