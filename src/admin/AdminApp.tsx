import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { onAuthStateChanged, signInWithPopup, signOut, type User } from 'firebase/auth'
import { track } from '../analytics'
import { DisciplineNotice } from '../components/DisciplineNotice'
import { SegmentedControl } from '../components/SegmentedControl'
import { getAdminRole, publishOfficialFixture, removeAdmin, removeMatchEvent, removeMatchRosterEntry, saveMatch, saveMatchEvent, saveMatchRosterEntry, savePlayer, saveTeam, saveAdmin, subscribeToAdmins } from '../data/firestore'
import type { AdminEntry } from '../data/firestore'
import { matches as officialMatches } from '../data/matches'
import { players as officialPlayers } from '../data/players'
import { TIMEZONE, stageLabels, statusLabels, tournamentConfigs } from '../data/tournamentConfig'
import { OWNER_EMAIL, auth, googleProvider } from '../firebase'
import { useTournamentData } from '../hooks/useTournamentData'
import type { Category, Match, MatchEventType, MatchResolution, MatchRosterEntry, MatchStage, Player, Team } from '../types/tournament'
import { buildStartDateTime, formatDay, formatTime, splitStartDateTime } from '../utils/date'
import { sortMatches } from '../utils/matches'
import { REGULATION_PERIODS } from '../utils/matchStatus'
import { adminDocId, isValidAdminEmail, roleLabels, type AdminRole } from '../utils/admins'
import { calculateDiscipline } from '../utils/discipline'
import { areOfficialRostersPublished, isOfficialFixturePublished } from '../utils/publishing'
import styles from './AdminApp.module.css'

type AdminView = 'matches' | 'teams' | 'statistics'
type AdminScope = Category | 'all'

const scopeCategories: Record<AdminScope, Category[]> = {
  all: ['men', 'women'],
  men: ['men'],
  women: ['women'],
}

const eventTypes: MatchEventType[] = ['goal', 'penalty', 'major-penalty']
const resolutions: MatchResolution[] = ['regulation', 'overtime', 'shootout']
const resolutionLabels: Record<MatchResolution, string> = {
  regulation: 'En tiempo reglamentario (3 / 0)',
  overtime: 'En tiempo extra (2 / 1)',
  shootout: 'Por penales (2 / 1)',
}
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
  const [access, setAccess] = useState<'checking' | AdminRole | 'denied'>('denied')
  const [message, setMessage] = useState('')
  const [view, setView] = useState<AdminView>('matches')
  const [scope, setScope] = useState<AdminScope>('all')

  useEffect(() => onAuthStateChanged(auth, setUser), [])

  // Membership lives in Firestore, so the answer arrives asynchronously.
  useEffect(() => {
    if (!user?.email) {
      setAccess('denied')
      return
    }
    let current = true
    setAccess('checking')
    getAdminRole(user.email)
      .then((role) => current && setAccess(role ?? 'denied'))
      .catch(() => current && setAccess('denied'))
    return () => { current = false }
  }, [user])

  const login = async () => {
    setMessage('')
    try {
      const result = await signInWithPopup(auth, googleProvider)
      if (await getAdminRole(result.user.email)) {
        void track('admin_action', { action: 'sign_in' })
        return
      }
      await signOut(auth)
      setMessage('Esta cuenta no tiene permisos de administración.')
      void track('admin_action', { action: 'sign_in_rejected' })
    } catch {
      setMessage('No se pudo iniciar sesión. Volvé a intentarlo.')
    }
  }

  if (access === 'checking') return (
    <main className={styles.login}>
      <div className={styles.panel}>
        <div className={styles.logo}>CFM</div>
        <p>Verificando permisos…</p>
      </div>
    </main>
  )

  if (access === 'denied') return (
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

  const isOwner = access === 'owner'
  const categories = scopeCategories[scope]
  const bothTournaments = categories.length > 1
  const scopedTeams = teams.filter((team) => categories.includes(team.category))
  // Firestore hands the documents back by ID, so the panel sorts them like the site.
  const scopedMatches = sortMatches(matches.filter((match) => categories.includes(match.category)))
  const scopeLabel = bothTournaments ? '' : scope === 'men' ? ' masculinos' : ' femeninos'
  const dataPublished =
    isOfficialFixturePublished(matches, officialMatches) && areOfficialRostersPublished(players, officialPlayers)
  const notify = (text: string) => setMessage(text)

  return (
    <main className={styles.admin}>
      <header>
        <div><span>CFM Ushuaia Hockey</span><h1>Administración</h1></div>
        <button type="button" className={styles.secondary} onClick={() => signOut(auth)}>Salir</button>
      </header>
      {isOwner && !dataPublished && <FixturePublisher pending notify={notify} />}
      <nav className={styles.mainTabs} aria-label="Administración">
        <SegmentedControl label="Sección" value={view} onChange={setView} options={[
          { value: 'matches' as AdminView, label: 'Partidos' },
          ...(isOwner ? [{ value: 'teams' as AdminView, label: 'Equipos' }] : []),
          { value: 'statistics' as AdminView, label: 'Estadísticas' },
        ]} />
      </nav>
      <SegmentedControl label="Torneo" value={scope} onChange={setScope} options={[
        { value: 'all' as AdminScope, label: 'Todos' },
        { value: 'men' as AdminScope, label: 'Masculino' },
        { value: 'women' as AdminScope, label: 'Femenino' },
      ]} />

      {view === 'matches' && (
        <>
          {isOwner && (
            <section className={styles.section}>
              <h2>Crear partido</h2>
              {bothTournaments
                ? <p className={styles.hint}>Elegí Masculino o Femenino para crear un partido.</p>
                : <MatchForm category={scope as Category} teams={scopedTeams} onSaved={() => notify('Partido creado.')} />}
            </section>
          )}
          <section className={styles.section}>
            <h2>Partidos{scopeLabel}</h2>
            <p className={styles.hint}>El estado se calcula automáticamente según el horario. Cada partido dura dos tiempos de 20 minutos.</p>
            <div className={styles.matchList}>{scopedMatches.map((match) => (
              <MatchEditor
                key={match.id}
                match={match}
                teams={teams}
                showCategory={bothTournaments}
                canReschedule={isOwner}
                onSaved={(what) => notify(what)}
              />
            ))}</div>
          </section>
        </>
      )}

      {view === 'teams' && isOwner && (
        <section className={styles.section}>
          <h2>Equipos{scopeLabel}</h2>
          <p className={styles.hint}>Se mantienen seis equipos masculinos y cinco femeninos. Editá sus nombres antes de armar el calendario.</p>
          <div className={styles.teamList}>{scopedTeams.map((team, index) => (
            <TeamEditor key={team.id} team={team} position={index + 1} onSaved={() => notify('Equipo actualizado.')} />
          ))}</div>
        </section>
      )}

      {view === 'statistics' && (
        <StatisticsAdmin
          matches={scopedMatches}
          teams={scopedTeams}
          players={players.filter((player) => categories.includes(player.category))}
          rosters={rosters.filter((entry) => categories.includes(entry.category))}
          events={events.filter((event) => categories.includes(event.category))}
          showCategory={bothTournaments}
          categories={categories}
          notify={notify}
          canManageSquads={isOwner}
        />
      )}

      {isOwner && dataPublished && <FixturePublisher notify={notify} />}
      {isOwner && <AdminManager currentEmail={user?.email ?? ''} notify={notify} />}

      {message && <div className={styles.toast} role="status">{message}</div>}
      <a className={styles.publicLink} href="./">Ver sitio público</a>
    </main>
  )
}

function AdminManager({ currentEmail, notify }: { currentEmail: string; notify: (message: string) => void }) {
  const [admins, setAdmins] = useState<AdminEntry[]>([])
  const [email, setEmail] = useState('')
  const [role, setRole] = useState<AdminRole>('editor')
  const [failed, setFailed] = useState(false)
  useEffect(() => subscribeToAdmins(setAdmins, () => setFailed(true)), [])

  const owner = adminDocId(OWNER_EMAIL)
  const me = adminDocId(currentEmail)
  const listed = admins.some((entry) => entry.email === owner)
    ? admins
    : [{ email: owner, role: 'owner' as AdminRole }, ...admins]

  const add = async (event: FormEvent) => {
    event.preventDefault()
    if (!isValidAdminEmail(email)) {
      notify('Escribí una dirección de correo válida.')
      return
    }
    try {
      await saveAdmin(email, role)
      setEmail('')
      notify('Administrador agregado.')
      void track('admin_action', { action: 'add_admin', role })
    } catch {
      notify('No se pudo agregar. Revisá que las reglas de Firestore estén publicadas.')
    }
  }

  const remove = async (entry: string) => {
    if (!window.confirm(`Se le quita el acceso al panel a ${entry}. ¿Continuar?`)) return
    try {
      await removeAdmin(entry)
      notify('Administrador quitado.')
      void track('admin_action', { action: 'remove_admin' })
    } catch {
      notify('No se pudo quitar. Volvé a intentarlo.')
    }
  }

  return (
    <section className={styles.section}>
      <h2>Administradores</h2>
      <p className={styles.hint}>
        <strong>Planilla</strong> carga resultados, convocatorias y estadísticas.{' '}
        <strong>Organización</strong> además crea partidos, edita equipos y planteles, y maneja esta lista.
        {failed && ' No se pudo leer la lista: puede que falte publicar las reglas de Firestore.'}
      </p>
      <form className={styles.adminForm} onSubmit={add}>
        <label>Correo de Google
          <input type="email" placeholder="nombre@example.com" value={email} onChange={(event) => setEmail(event.target.value)} />
        </label>
        <label>Permisos
          <select value={role} onChange={(event) => setRole(event.target.value as AdminRole)}>
            <option value="editor">{roleLabels.editor}</option>
            <option value="owner">{roleLabels.owner}</option>
          </select>
        </label>
        <button type="submit">Agregar</button>
      </form>
      <div className={styles.events}>{listed.map((entry) => (
        <div key={entry.email}>
          <span>
            <strong>{entry.email}</strong> · {roleLabels[entry.role]}
            {entry.email === owner ? ' · fundador' : ''}
            {entry.email === me && entry.email !== owner ? ' · vos' : ''}
          </span>
          {entry.email !== owner && entry.email !== me && (
            <button type="button" className={styles.danger} onClick={() => remove(entry.email)}>Quitar</button>
          )}
        </div>
      ))}</div>
    </section>
  )
}

function FixturePublisher({ pending = false, notify }: { pending?: boolean; notify: (message: string) => void }) {
  const [publishing, setPublishing] = useState(false)
  const publish = async () => {
    if (!window.confirm('Se borran todos los equipos y partidos publicados, se cargan los del fixture oficial y se agregan los planteles inscriptos. Las estadísticas ya cargadas quedarían sin partido asociado. ¿Continuar?')) return
    setPublishing(true)
    try {
      await publishOfficialFixture()
      void track('admin_action', { action: 'publish_official_data' })
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

function MatchEditor({ match, teams, showCategory = false, canReschedule = false, onSaved }: {
  match: Match; teams: Team[]; showCategory?: boolean; canReschedule?: boolean
  onSaved: (message: string) => void
}) {
  const [homeScore, setHomeScore] = useState<number | null>(match.homeScore)
  const [awayScore, setAwayScore] = useState<number | null>(match.awayScore)
  const [resolution, setResolution] = useState<MatchResolution>(match.resolution ?? 'regulation')
  const scheduled = splitStartDateTime(match.startDateTime)
  const [date, setDate] = useState(scheduled.date)
  const [time, setTime] = useState(scheduled.time)
  useEffect(() => { setHomeScore(match.homeScore); setAwayScore(match.awayScore) }, [match.homeScore, match.awayScore])
  useEffect(() => setResolution(match.resolution ?? 'regulation'), [match.resolution])
  useEffect(() => {
    const next = splitStartDateTime(match.startDateTime)
    setDate(next.date)
    setTime(next.time)
  }, [match.startDateTime])

  const isTied = homeScore !== null && awayScore !== null && homeScore === awayScore
  const startDateTime = canReschedule && date && time ? buildStartDateTime(date, time) : match.startDateTime
  const moved = startDateTime !== match.startDateTime

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    const resolved = isTied ? 'regulation' : resolution
    await saveMatch({ ...match, startDateTime, homeScore, awayScore, resolution: resolved })
    void track('admin_action', { action: moved ? 'reschedule_match' : 'save_result', resolution: resolved })
    onSaved(moved ? 'Partido reprogramado.' : 'Resultado actualizado.')
  }
  return (
    <form className={styles.match} onSubmit={submit}>
      <div className={styles.matchHeader}>
        <div><strong>{getMatchName(match, teams)}</strong><span>{showCategory ? `${tournamentConfigs[match.category].shortName} · ` : ''}{formatDay(match.startDateTime, TIMEZONE)} · {formatTime(match.startDateTime, TIMEZONE)} · {stageLabels[match.stage]}</span></div>
        <span className={`${styles.status} ${styles[match.status]}`}>{statusLabels[match.status]}</span>
      </div>
      <div className={styles.scoreEditor}>
        <label><span>{getTeamName(match.homeTeamId, match.homeLabel, teams)}</span><input aria-label={`Goles de ${getTeamName(match.homeTeamId, match.homeLabel, teams)}`} type="number" min="0" placeholder="—" value={homeScore ?? ''} onChange={(event) => setHomeScore(event.target.value === '' ? null : Number(event.target.value))} /></label>
        <span className={styles.versus}>—</span>
        <label><span>{getTeamName(match.awayTeamId, match.awayLabel, teams)}</span><input aria-label={`Goles de ${getTeamName(match.awayTeamId, match.awayLabel, teams)}`} type="number" min="0" placeholder="—" value={awayScore ?? ''} onChange={(event) => setAwayScore(event.target.value === '' ? null : Number(event.target.value))} /></label>
        <button type="submit">Guardar</button>
      </div>
      {canReschedule && (
        <div className={styles.reschedule}>
          <label>Fecha<input type="date" value={date} onChange={(event) => setDate(event.target.value)} /></label>
          <label>Hora<input type="time" value={time} onChange={(event) => setTime(event.target.value)} /></label>
        </div>
      )}
      <label className={styles.resolution}>
        Cómo se definió
        <select value={resolution} disabled={isTied} onChange={(event) => setResolution(event.target.value as MatchResolution)}>
          {resolutions.map((value) => (
            <option key={value} value={value}>{resolutionLabels[value]}</option>
          ))}
        </select>
      </label>
      <p className={styles.hint}>
        {isTied
          ? 'Un partido no puede terminar empatado. Cargá el resultado final del tiempo extra o de los penales.'
          : moved
            ? `Se va a reprogramar para el ${formatDay(startDateTime, TIMEZONE).toLocaleLowerCase('es')} a las ${formatTime(startDateTime, TIMEZONE)}.`
            : 'En tiempo reglamentario el ganador suma 3 y el perdedor 0. En tiempo extra o penales, 2 y 1.'}
      </p>
    </form>
  )
}

function StatisticsAdmin({ matches, teams, players, rosters, events, notify, canManageSquads, showCategory, categories }: {
  matches: Match[]; teams: Team[]; players: Player[]
  rosters: MatchRosterEntry[]; events: ReturnType<typeof useTournamentData>['events']
  notify: (message: string) => void; canManageSquads: boolean; showCategory: boolean
  categories: Category[]
}) {
  const [selectedMatchId, setSelectedMatchId] = useState('')
  const selectedMatch = matches.find((match) => match.id === selectedMatchId)
  return (
    <>
      {canManageSquads && <section className={styles.section}>
        <h2>Planteles</h2>
        <PlayerForm teams={teams} onSaved={() => notify('Jugador/a agregado/a.')} />
        <p className={styles.hint}>Dar de baja oculta al jugador del sitio y de las convocatorias, sin perder las estadísticas que ya tenga cargadas.</p>
        <div className={styles.events}>{players.map((player) => (
          <div key={player.id} className={player.active ? undefined : styles.inactive}>
            <span><strong>{player.name}</strong>{player.role ? ` · ${player.role}` : ''} · {teams.find((team) => team.id === player.teamId)?.name}{player.active ? '' : ' · dado de baja'}</span>
            <button
              type="button"
              className={player.active ? styles.danger : undefined}
              onClick={() => savePlayer({ ...player, active: !player.active })}
            >
              {player.active ? 'Dar de baja' : 'Reactivar'}
            </button>
          </div>
        ))}</div>
      </section>}
      {categories.map((category) => (
        <DisciplineNotice key={category} rows={calculateDiscipline(category, events)} teams={teams} />
      ))}
      <section className={styles.section}>
        <h2>Cargar gol, asistencia o falta</h2>
        <label>Partido<select value={selectedMatchId} onChange={(event) => setSelectedMatchId(event.target.value)}><option value="">Seleccionar partido…</option>{matches.map((match) => <option key={match.id} value={match.id}>{showCategory ? `${tournamentConfigs[match.category].shortName} · ` : ''}{getMatchOptionLabel(match, teams)}</option>)}</select></label>
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

function PlayerForm({ teams, onSaved }: { teams: Team[]; onSaved: () => void }) {
  const [teamId, setTeamId] = useState('')
  const [name, setName] = useState('')
  const [number, setNumber] = useState('')
  const submit = async (event: FormEvent) => {
    event.preventDefault()
    const team = teams.find((item) => item.id === teamId)
    if (!name.trim() || !team) return
    // The tournament comes from the team, so the form works with either scope.
    await savePlayer({ id: crypto.randomUUID(), category: team.category, teamId: team.id, name: name.trim(), number: number === '' ? undefined : Number(number), active: true })
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
  const availablePlayers = players.filter((player) => player.active && eligibleTeamIds.includes(player.teamId) && !entries.some((entry) => entry.playerId === player.id))
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
    void track('admin_action', { action: 'save_roster_entry' })
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
    void track('admin_action', { action: 'publish_event', event_type: type })
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
      <label>Período<input type="number" min="1" max={REGULATION_PERIODS + 1} value={period} onChange={(event) => setPeriod(Number(event.target.value))} /></label>
      <label>Tiempo de juego<input placeholder="Ej. 12:34" pattern="[0-9]{1,2}:[0-9]{2}" value={gameTime} onChange={(event) => setGameTime(event.target.value)} /></label>
      <button type="submit">Publicar evento</button>
    </form>
  )
}
