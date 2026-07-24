import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { onAuthStateChanged, signInWithPopup, signOut, type User } from 'firebase/auth'
import { SegmentedControl } from '../components/SegmentedControl'
import { publishOfficialFixture, removeMatchEvent, removeMatchRosterEntry, removePlayer, saveMatch, saveMatchEvent, saveMatchRosterEntry, savePlayer, saveTeam } from '../data/firestore'
import { matches as officialMatches } from '../data/matches'
import { players as officialPlayers } from '../data/players'
import { TIMEZONE, stageLabels, statusLabels } from '../data/tournamentConfig'
import { ADMIN_EMAIL, auth, googleProvider } from '../firebase'
import { useTournamentData } from '../hooks/useTournamentData'
import type { Category, Match, MatchEventType, MatchRosterEntry, MatchStage, Player, Team } from '../types/tournament'
import { formatDay, formatTime } from '../utils/date'
import { areOfficialRostersPublished, isOfficialFixturePublished } from '../utils/publishing'
import styles from './AdminApp.module.css'

type AdminView = 'matches' | 'teams' | 'statistics'

const eventTypes: MatchEventType[] = ['goal', 'penalty', 'major-penalty']
const stagesByCategory: Record<Category, MatchStage[]> = {
  men: ['regular', 'repechaje-a', 'repechaje-b', 'final-a', 'final-b'],
  women: ['regular', 'repechaje', 'semifinal-2', 'semifinal-1', 'third-place', 'final'],
}

const getTeamName = (teamId: string | undefined, label: string | undefined, teams: Team[]) =>
  teams.find((team) => team.id === teamId)?.name ?? label ?? 'A confirmar'

const getMatchName = (match: Match, teams: Team[]) =>
  `${getTeamName(match.homeTeamId, match.homeLabel, teams)} vs ${getTeamName(match.awayTeamId, match.awayLabel, teams)}`

const getMatchOptionLabel = (match: Match, teams: Team[]) =>
  `${getMatchName(match, teams)} · ${formatDay(match.startDateTime, TIMEZONE)} · ${formatTime(match.startDateTime, TIMEZONE)}`

export function AdminApp() {
  const { matches, teams, players, rosters, events } = useTournamentData()
  const [user, setUser] = useState<User | null>(null)
  const [message, setMessage] = useState('')
  const [view, setView] = useState<AdminView>('matches')
  const [category, setCategory] = useState<Category>('men')

  useEffect(() => onAuthStateChanged(auth, setUser), [])
  const isAdmin = user?.email === ADMIN_EMAIL

  const login = async () => {
    setMessage('')
    try {
      const result = await signInWithPopup(auth, googleProvider)
      if (result.user.email !== ADMIN_EMAIL) {
        await signOut(auth)
        setMessage('Esta cuenta no tiene permisos de administración.')
      }
    } catch {
      setMessage('No se pudo iniciar sesión. Volvé a intentarlo.')
    }
  }

  if (!isAdmin) return (
    <main className={styles.login}>
      <div className={styles.panel}>
        <div className={styles.logo}>CFM</div>
        <h1>Administración</h1>
        <p>Ingresá con la cuenta autorizada para actualizar el torneo.</p>
        <button type="button" onClick={login}>Ingresar con Google</button>
        {message && <p className={styles.error}>{message}</p>}
        <a href="./">Volver al sitio público</a>
      </div>
    </main>
  )

  const categoryTeams = teams.filter((team) => team.category === category)
  const categoryMatches = matches.filter((match) => match.category === category)
  const dataPublished =
    isOfficialFixturePublished(matches, officialMatches) && areOfficialRostersPublished(players, officialPlayers)
  const notify = (text: string) => setMessage(text)

  return (
    <main className={styles.admin}>
      <header>
        <div><span>CFM Ushuaia Hockey</span><h1>Administración</h1></div>
        <button type="button" className={styles.secondary} onClick={() => signOut(auth)}>Salir</button>
      </header>
      {!dataPublished && <FixturePublisher pending notify={notify} />}
      <nav className={styles.mainTabs} aria-label="Administración">
        <SegmentedControl label="Sección" value={view} onChange={setView} options={[
          { value: 'matches', label: 'Partidos' },
          { value: 'teams', label: 'Equipos' },
          { value: 'statistics', label: 'Estadísticas' },
        ]} />
      </nav>
      <SegmentedControl label="Torneo" value={category} onChange={setCategory} options={[
        { value: 'men', label: 'Masculino' },
        { value: 'women', label: 'Femenino' },
      ]} />

      {view === 'matches' && (
        <>
          <section className={styles.section}>
            <h2>Crear partido</h2>
            <MatchForm category={category} teams={categoryTeams} onSaved={() => notify('Partido creado.')} />
          </section>
          <section className={styles.section}>
            <h2>Partidos {category === 'men' ? 'masculinos' : 'femeninos'}</h2>
            <p className={styles.hint}>El estado se calcula automáticamente según el horario. Cada partido ocupa una franja de 60 minutos.</p>
            <div className={styles.matchList}>{categoryMatches.map((match) => (
              <MatchEditor key={match.id} match={match} teams={teams} onSaved={() => notify('Resultado actualizado.')} />
            ))}</div>
          </section>
        </>
      )}

      {view === 'teams' && (
        <section className={styles.section}>
          <h2>Equipos {category === 'men' ? 'masculinos' : 'femeninos'}</h2>
          <p className={styles.hint}>{category === 'men' ? 'Se mantienen seis equipos.' : 'Se mantienen cinco equipos.'} Editá sus nombres antes de armar el calendario.</p>
          <div className={styles.teamList}>{categoryTeams.map((team, index) => (
            <TeamEditor key={team.id} team={team} position={index + 1} onSaved={() => notify('Equipo actualizado.')} />
          ))}</div>
        </section>
      )}

      {view === 'statistics' && (
        <StatisticsAdmin
          category={category}
          matches={categoryMatches}
          teams={categoryTeams}
          players={players.filter((player) => player.category === category)}
          rosters={rosters.filter((entry) => entry.category === category)}
          events={events.filter((event) => event.category === category)}
          notify={notify}
        />
      )}

      {dataPublished && <FixturePublisher notify={notify} />}

      {message && <div className={styles.toast} role="status">{message}</div>}
      <a className={styles.publicLink} href="./">Ver sitio público</a>
    </main>
  )
}

function FixturePublisher({ pending = false, notify }: { pending?: boolean; notify: (message: string) => void }) {
  const [publishing, setPublishing] = useState(false)
  const publish = async () => {
    if (!window.confirm('Se borran todos los equipos y partidos publicados, se cargan los del fixture oficial y se agregan los planteles inscriptos. Las estadísticas ya cargadas quedarían sin partido asociado. ¿Continuar?')) return
    setPublishing(true)
    try {
      await publishOfficialFixture()
      notify('Fixture y planteles oficiales publicados.')
    } catch {
      notify('No se pudieron publicar los datos. Volvé a intentarlo.')
    } finally {
      setPublishing(false)
    }
  }
  return (
    <section className={`${styles.section} ${pending ? styles.callout : ''}`}>
      <h2>Datos oficiales</h2>
      <p className={styles.hint}>
        {pending
          ? 'Los datos publicados no son los oficiales. El sitio público sigue mostrando los anteriores hasta que los reemplaces.'
          : 'Reemplaza equipos y partidos por el fixture oficial y carga los planteles inscriptos. Las convocatorias y las estadísticas no se tocan.'}
      </p>
      <button type="button" className={pending ? undefined : styles.danger} disabled={publishing} onClick={publish}>
        {publishing ? 'Publicando…' : 'Publicar fixture y planteles oficiales'}
      </button>
    </section>
  )
}

function TeamEditor({ team, position, onSaved }: { team: Team; position: number; onSaved: () => void }) {
  const [name, setName] = useState(team.name)
  useEffect(() => setName(team.name), [team.name])
  const submit = async (event: FormEvent) => {
    event.preventDefault()
    if (!name.trim()) return
    await saveTeam({ ...team, name: name.trim(), shortName: name.trim() })
    onSaved()
  }
  return (
    <form className={styles.teamEditor} onSubmit={submit}>
      <span>{position}</span>
      <label>Nombre del equipo<input value={name} onChange={(event) => setName(event.target.value)} /></label>
      <button type="submit">Guardar</button>
    </form>
  )
}

function MatchForm({ category, teams, onSaved }: { category: Category; teams: Team[]; onSaved: () => void }) {
  const [homeTeamId, setHomeTeamId] = useState('')
  const [awayTeamId, setAwayTeamId] = useState('')
  const [date, setDate] = useState('')
  const [time, setTime] = useState('')
  const [stage, setStage] = useState<MatchStage>('regular')

  useEffect(() => { setHomeTeamId(''); setAwayTeamId(''); setStage('regular') }, [category])
  const submit = async (event: FormEvent) => {
    event.preventDefault()
    if (!homeTeamId || !awayTeamId || homeTeamId === awayTeamId || !date || !time) return
    await saveMatch({
      id: crypto.randomUUID(),
      category,
      startDateTime: `${date}T${time}:00-03:00`,
      stage,
      homeTeamId,
      awayTeamId,
      homeScore: null,
      awayScore: null,
      status: 'upcoming',
      countsForStandings: stage === 'regular',
    })
    setHomeTeamId(''); setAwayTeamId(''); setDate(''); setTime(''); onSaved()
  }
  return (
    <form className={styles.createMatch} onSubmit={submit}>
      <label>Equipo local<select required value={homeTeamId} onChange={(event) => setHomeTeamId(event.target.value)}><option value="">Seleccionar…</option>{teams.map((team) => <option key={team.id} value={team.id}>{team.name}</option>)}</select></label>
      <label>Equipo visitante<select required value={awayTeamId} onChange={(event) => setAwayTeamId(event.target.value)}><option value="">Seleccionar…</option>{teams.filter((team) => team.id !== homeTeamId).map((team) => <option key={team.id} value={team.id}>{team.name}</option>)}</select></label>
      <label>Fecha<input required type="date" value={date} onChange={(event) => setDate(event.target.value)} /></label>
      <label>Hora<input required type="time" value={time} onChange={(event) => setTime(event.target.value)} /></label>
      <label>Etapa<select value={stage} onChange={(event) => setStage(event.target.value as MatchStage)}>{stagesByCategory[category].map((value) => <option key={value} value={value}>{stageLabels[value]}</option>)}</select></label>
      <button type="submit">Crear partido</button>
    </form>
  )
}

function MatchEditor({ match, teams, onSaved }: { match: Match; teams: Team[]; onSaved: () => void }) {
  const [homeScore, setHomeScore] = useState<number | null>(match.homeScore)
  const [awayScore, setAwayScore] = useState<number | null>(match.awayScore)
  const [overtime, setOvertime] = useState(match.decidedInOvertime ?? false)
  useEffect(() => { setHomeScore(match.homeScore); setAwayScore(match.awayScore) }, [match.homeScore, match.awayScore])
  useEffect(() => setOvertime(match.decidedInOvertime ?? false), [match.decidedInOvertime])
  const isDraw = homeScore !== null && awayScore !== null && homeScore === awayScore
  const submit = async (event: FormEvent) => {
    event.preventDefault()
    await saveMatch({ ...match, homeScore, awayScore, decidedInOvertime: overtime && !isDraw })
    onSaved()
  }
  return (
    <form className={styles.match} onSubmit={submit}>
      <div className={styles.matchHeader}>
        <div><strong>{getMatchName(match, teams)}</strong><span>{formatDay(match.startDateTime, TIMEZONE)} · {formatTime(match.startDateTime, TIMEZONE)} · {stageLabels[match.stage]}</span></div>
        <span className={`${styles.status} ${styles[match.status]}`}>{statusLabels[match.status]}</span>
      </div>
      <div className={styles.scoreEditor}>
        <label><span>{getTeamName(match.homeTeamId, match.homeLabel, teams)}</span><input aria-label={`Goles de ${getTeamName(match.homeTeamId, match.homeLabel, teams)}`} type="number" min="0" placeholder="—" value={homeScore ?? ''} onChange={(event) => setHomeScore(event.target.value === '' ? null : Number(event.target.value))} /></label>
        <span className={styles.versus}>—</span>
        <label><span>{getTeamName(match.awayTeamId, match.awayLabel, teams)}</span><input aria-label={`Goles de ${getTeamName(match.awayTeamId, match.awayLabel, teams)}`} type="number" min="0" placeholder="—" value={awayScore ?? ''} onChange={(event) => setAwayScore(event.target.value === '' ? null : Number(event.target.value))} /></label>
        <button type="submit">Guardar resultado</button>
      </div>
      <label className={styles.overtime}>
        <input type="checkbox" checked={overtime} disabled={isDraw} onChange={(event) => setOvertime(event.target.checked)} />
        <span>Se definió en tiempo extra: el ganador suma 2 y el perdedor 1.</span>
      </label>
    </form>
  )
}

function StatisticsAdmin({ category, matches, teams, players, rosters, events, notify }: {
  category: Category; matches: Match[]; teams: Team[]; players: Player[]
  rosters: MatchRosterEntry[]; events: ReturnType<typeof useTournamentData>['events']; notify: (message: string) => void
}) {
  const [selectedMatchId, setSelectedMatchId] = useState('')
  const selectedMatch = matches.find((match) => match.id === selectedMatchId)
  return (
    <>
      <section className={styles.section}>
        <h2>Planteles</h2>
        <PlayerForm category={category} teams={teams} onSaved={() => notify('Jugador/a agregado/a.')} />
        <div className={styles.events}>{players.map((player) => <div key={player.id}><span><strong>{player.name}</strong> · #{player.number ?? '—'} · {teams.find((team) => team.id === player.teamId)?.name}</span><button type="button" className={styles.danger} onClick={() => removePlayer(player.id)}>Eliminar</button></div>)}</div>
      </section>
      <section className={styles.section}>
        <h2>Cargar gol, asistencia o falta</h2>
        <label>Partido<select value={selectedMatchId} onChange={(event) => setSelectedMatchId(event.target.value)}><option value="">Seleccionar partido…</option>{matches.map((match) => <option key={match.id} value={match.id}>{getMatchOptionLabel(match, teams)}</option>)}</select></label>
        {selectedMatch && <>
          <MatchRosterForm
            match={selectedMatch}
            teams={teams}
            players={players}
            entries={rosters.filter((entry) => entry.matchId === selectedMatch.id)}
            onSaved={() => notify('Convocatoria actualizada.')}
          />
          <EventForm
            match={selectedMatch}
            teams={teams}
            players={players}
            entries={rosters.filter((entry) => entry.matchId === selectedMatch.id)}
            onSaved={() => notify('Estadística publicada.')}
          />
        </>}
        <div className={styles.events}>{events.map((event) => {
          const match = matches.find((item) => item.id === event.matchId)
          return <div key={event.id}><span><strong>{event.jerseyNumber !== undefined ? `#${event.jerseyNumber} ` : ''}{event.playerName}</strong> · {event.type === 'goal' ? 'Gol' : event.type === 'penalty' ? 'Falta' : 'Falta grave'}{match ? ` · ${getMatchName(match, teams)}` : ''}</span><button type="button" className={styles.danger} onClick={() => removeMatchEvent(event.id)}>Eliminar</button></div>
        })}</div>
      </section>
    </>
  )
}

function PlayerForm({ category, teams, onSaved }: { category: Category; teams: Team[]; onSaved: () => void }) {
  const [teamId, setTeamId] = useState('')
  const [name, setName] = useState('')
  const [number, setNumber] = useState('')
  useEffect(() => setTeamId(''), [category])
  const submit = async (event: FormEvent) => {
    event.preventDefault()
    if (!name.trim() || !teamId) return
    await savePlayer({ id: crypto.randomUUID(), category, teamId, name: name.trim(), number: number === '' ? undefined : Number(number), active: true })
    setName(''); setNumber(''); onSaved()
  }
  return (
    <form className={styles.eventForm} onSubmit={submit}>
      <label>Equipo<select required value={teamId} onChange={(event) => setTeamId(event.target.value)}><option value="">Seleccionar…</option>{teams.map((team) => <option key={team.id} value={team.id}>{team.name}</option>)}</select></label>
      <label>Nombre<input required value={name} onChange={(event) => setName(event.target.value)} /></label>
      <label>Número habitual (opcional)<input type="number" min="0" value={number} onChange={(event) => setNumber(event.target.value)} /></label>
      <button type="submit">Agregar al plantel</button>
    </form>
  )
}

function MatchRosterForm({ match, teams, players, entries, onSaved }: {
  match: Match; teams: Team[]; players: Player[]; entries: MatchRosterEntry[]; onSaved: () => void
}) {
  const eligibleTeamIds = [match.homeTeamId, match.awayTeamId]
  const availablePlayers = players.filter((player) => eligibleTeamIds.includes(player.teamId) && !entries.some((entry) => entry.playerId === player.id))
  const [playerId, setPlayerId] = useState('')
  const [jerseyNumber, setJerseyNumber] = useState('')
  const submit = async (event: FormEvent) => {
    event.preventDefault()
    const player = players.find((item) => item.id === playerId)
    if (!player || jerseyNumber === '') return
    await saveMatchRosterEntry({
      id: `${match.id}_${player.id}`,
      matchId: match.id,
      category: match.category,
      teamId: player.teamId,
      playerId: player.id,
      playerName: player.name,
      jerseyNumber: Number(jerseyNumber),
    })
    setPlayerId(''); setJerseyNumber(''); onSaved()
  }
  return (
    <div className={styles.roster}>
      <h3>Convocados para este partido</h3>
      <p className={styles.hint}>Agregá solamente quienes asistieron y el número que usaron hoy.</p>
      <form className={styles.rosterForm} onSubmit={submit}>
        <label>Jugador/a<select required value={playerId} onChange={(event) => {
          const id = event.target.value
          setPlayerId(id)
          const player = players.find((item) => item.id === id)
          setJerseyNumber(player?.number?.toString() ?? '')
        }}><option value="">Seleccionar…</option>{availablePlayers.map((player) => <option key={player.id} value={player.id}>{player.name} · {teams.find((team) => team.id === player.teamId)?.name}</option>)}</select></label>
        <label>Número usado<input required type="number" min="0" value={jerseyNumber} onChange={(event) => setJerseyNumber(event.target.value)} /></label>
        <button type="submit">Agregar convocado</button>
      </form>
      <div className={styles.rosterEntries}>{entries.map((entry) => <div key={entry.id}><span><strong>#{entry.jerseyNumber}</strong> {entry.playerName} · {teams.find((team) => team.id === entry.teamId)?.name}</span><button type="button" className={styles.danger} onClick={() => removeMatchRosterEntry(entry.id)}>Quitar</button></div>)}</div>
    </div>
  )
}

function EventForm({ match, teams, players, entries, onSaved }: {
  match: Match; teams: Team[]; players: Player[]; entries: MatchRosterEntry[]; onSaved: () => void
}) {
  const eligibleTeams = useMemo(() => teams.filter((team) => team.id === match.homeTeamId || team.id === match.awayTeamId), [match, teams])
  const [type, setType] = useState<MatchEventType>('goal')
  const [teamId, setTeamId] = useState(eligibleTeams[0]?.id ?? '')
  const [playerId, setPlayerId] = useState('')
  const [assistId, setAssistId] = useState('')
  const [secondAssistId, setSecondAssistId] = useState('')
  const [period, setPeriod] = useState(1)
  const [gameTime, setGameTime] = useState('')
  const [penaltyMinutes, setPenaltyMinutes] = useState(2)
  useEffect(() => setTeamId(eligibleTeams[0]?.id ?? ''), [eligibleTeams])
  const eligibleEntries = entries.filter((entry) => entry.teamId === teamId)
  const eligiblePlayers = eligibleEntries
    .map((entry) => players.find((player) => player.id === entry.playerId))
    .filter((player): player is Player => Boolean(player?.active))
  useEffect(() => { setPlayerId(''); setAssistId(''); setSecondAssistId('') }, [teamId])
  const submit = async (event: FormEvent) => {
    event.preventDefault()
    const player = players.find((item) => item.id === playerId)
    if (!player || !teamId) return
    const assist = players.find((item) => item.id === assistId)
    const secondAssist = players.find((item) => item.id === secondAssistId)
    const rosterEntry = entries.find((entry) => entry.playerId === player.id)
    await saveMatchEvent({
      id: crypto.randomUUID(), matchId: match.id, category: match.category, teamId, type,
      playerId: player.id, playerName: player.name, jerseyNumber: rosterEntry?.jerseyNumber,
      assistId: type === 'goal' ? assist?.id : undefined, assistName: type === 'goal' ? assist?.name : undefined,
      secondAssistId: type === 'goal' ? secondAssist?.id : undefined, secondAssistName: type === 'goal' ? secondAssist?.name : undefined,
      period, gameTime: gameTime.trim() || undefined, penaltyMinutes: type === 'goal' ? undefined : penaltyMinutes,
    })
    setPlayerId(''); setAssistId(''); setSecondAssistId(''); setGameTime(''); onSaved()
  }
  return (
    <form className={styles.eventForm} onSubmit={submit}>
      <label>Tipo<select value={type} onChange={(event) => setType(event.target.value as MatchEventType)}>{eventTypes.map((value) => <option key={value} value={value}>{value === 'goal' ? 'Gol' : value === 'penalty' ? 'Falta' : 'Falta grave'}</option>)}</select></label>
      <label>Equipo<select value={teamId} onChange={(event) => setTeamId(event.target.value)}>{eligibleTeams.map((team) => <option key={team.id} value={team.id}>{team.name}</option>)}</select></label>
      <label>Jugador/a<select required value={playerId} onChange={(event) => setPlayerId(event.target.value)}><option value="">Seleccionar…</option>{eligiblePlayers.map((player) => <option key={player.id} value={player.id}>#{entries.find((entry) => entry.playerId === player.id)?.jerseyNumber} · {player.name}</option>)}</select></label>
      {type === 'goal' ? <>
        <label>1.ª asistencia<select value={assistId} onChange={(event) => setAssistId(event.target.value)}><option value="">Sin asistencia</option>{eligiblePlayers.filter((player) => player.id !== playerId).map((player) => <option key={player.id} value={player.id}>{player.name}</option>)}</select></label>
        <label>2.ª asistencia<select value={secondAssistId} onChange={(event) => setSecondAssistId(event.target.value)}><option value="">Sin asistencia</option>{eligiblePlayers.filter((player) => player.id !== playerId && player.id !== assistId).map((player) => <option key={player.id} value={player.id}>{player.name}</option>)}</select></label>
      </> : <label>Minutos de penalización<input type="number" min="0" value={penaltyMinutes} onChange={(event) => setPenaltyMinutes(Number(event.target.value))} /></label>}
      <label>Período<input type="number" min="1" max="9" value={period} onChange={(event) => setPeriod(Number(event.target.value))} /></label>
      <label>Tiempo de juego<input placeholder="Ej. 12:34" pattern="[0-9]{1,2}:[0-9]{2}" value={gameTime} onChange={(event) => setGameTime(event.target.value)} /></label>
      <button type="submit">Publicar evento</button>
    </form>
  )
}
