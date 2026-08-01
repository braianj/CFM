import { useEffect, useMemo, useState, type FormEvent, type ReactNode } from 'react'
import { onAuthStateChanged, signInWithPopup, signOut, type User } from 'firebase/auth'
import { track } from '../analytics'
import { DisciplineNotice } from '../components/DisciplineNotice'
import { SegmentedControl } from '../components/SegmentedControl'
import { getAdminRole, publishOfficialFixture, removeAdmin, removeMatchEvent, removeMatchRosterEntry, saveMatch, saveMatchEvent, saveMatchRosterEntry, savePlayer, saveTeam, saveAdmin, subscribeToAdmins } from '../data/firestore'
import type { AdminEntry } from '../data/firestore'
import { matches as officialMatches } from '../data/matches'
import { players as officialPlayers } from '../data/players'
import { TIMEZONE, eventTypeLabels, stageLabels, tournamentConfigs } from '../data/tournamentConfig'
import { OWNER_EMAIL, auth, googleProvider } from '../firebase'
import { useTournamentData } from '../hooks/useTournamentData'
import type { Category, Match, MatchEvent, MatchEventType, MatchResolution, MatchRosterEntry, MatchStage, Player, Team } from '../types/tournament'
import { buildStartDateTime, formatDay, formatShortDay, formatTime, splitStartDateTime } from '../utils/date'
import { sortMatches } from '../utils/matches'
import { buildMatchSummary } from '../utils/matchSummary'
import { getMatchCode, getMatchProgress, type MatchProgress } from '../utils/matchProgress'
import { REGULATION_PERIODS } from '../utils/matchStatus'
import { adminDocId, isValidAdminEmail, roleLabels, type AdminRole } from '../utils/admins'
import { calculateDiscipline } from '../utils/discipline'
import { hasGoalkeeperLine } from '../utils/goalkeepers'
import { areOfficialRostersPublished, isOfficialFixturePublished } from '../utils/publishing'
import styles from './AdminApp.module.css'

type AdminView = 'matches' | 'teams'
type AdminScope = Category | 'all'

const scopeCategories: Record<AdminScope, Category[]> = {
  all: ['men', 'women'],
  men: ['men'],
  women: ['women'],
}

const eventTypes: MatchEventType[] = ['goal', 'penalty', 'major-penalty']
const resolutions: MatchResolution[] = ['regulation', 'overtime', 'shootout', 'walkover']
const resolutionLabels: Record<MatchResolution, string> = {
  regulation: 'En tiempo reglamentario (3 / 0)',
  overtime: 'En tiempo extra (2 / 1)',
  shootout: 'Por penales (2 / 1)',
  walkover: 'No se presentó un equipo (3 / 0)',
}
const stagesByCategory: Record<Category, MatchStage[]> = {
  men: ['regular', 'repechaje-a', 'repechaje-b', 'final-a', 'final-b'],
  women: ['regular', 'repechaje', 'semifinal-2', 'semifinal-1', 'third-place', 'final'],
}

// A jersey number on an event and the player it was matched to, if anybody was.
interface Person { jersey: string; playerId: string }
const person = (playerId?: string, jerseyNumber?: number): Person => ({
  jersey: jerseyNumber?.toString() ?? '',
  playerId: playerId ?? '',
})

// Blank stays blank: an unreadable field must not be saved as zero.
const numberOr = (value: string) => (value.trim() === '' ? undefined : Number(value))

const getTeamName = (teamId: string | undefined, label: string | undefined, teams: Team[]) =>
  teams.find((team) => team.id === teamId)?.name ?? label ?? 'A confirmar'

const getMatchName = (match: Match, teams: Team[]) =>
  `${getTeamName(match.homeTeamId, match.homeLabel, teams)} vs ${getTeamName(match.awayTeamId, match.awayLabel, teams)}`

export function AdminApp() {
  const { matches, publishedMatches, teams, players, rosters, events } = useTournamentData({ detail: true })
  const [user, setUser] = useState<User | null>(null)
  const [access, setAccess] = useState<'checking' | AdminRole | 'denied'>('denied')
  const [message, setMessage] = useState('')
  const [view, setView] = useState<AdminView>('matches')
  const [scope, setScope] = useState<AdminScope>('all')
  const [openMatchId, setOpenMatchId] = useState('')

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
  const openMatch = matches.find((match) => match.id === openMatchId)

  return (
    <main className={styles.admin}>
      <header>
        <div><span>CFM Ushuaia Hockey</span><h1>Administración</h1></div>
        <button type="button" className={styles.secondary} onClick={() => signOut(auth)}>Salir</button>
      </header>
      {isOwner && !dataPublished && !openMatch && <FixturePublisher pending notify={notify} />}

      {/* One match at a time: the operator has one paper sheet in their hand, and
          everything that sheet says belongs on one screen. */}
      {openMatch ? (
        <MatchWorkspace
          match={openMatch}
          published={publishedMatches.find((match) => match.id === openMatch.id) ?? openMatch}
          teams={teams}
          players={players.filter((player) => player.category === openMatch.category)}
          rosters={rosters.filter((entry) => entry.matchId === openMatch.id)}
          events={events.filter((event) => event.matchId === openMatch.id)}
          canReschedule={isOwner}
          onBack={() => setOpenMatchId('')}
          notify={notify}
        />
      ) : (
        <>
          <nav className={styles.mainTabs} aria-label="Administración">
            <SegmentedControl label="Sección" value={view} onChange={setView} options={[
              { value: 'matches' as AdminView, label: 'Partidos' },
              ...(isOwner ? [{ value: 'teams' as AdminView, label: 'Equipos y planteles' }] : []),
            ]} />
          </nav>
          <SegmentedControl label="Torneo" value={scope} onChange={setScope} options={[
            { value: 'all' as AdminScope, label: 'Todos' },
            { value: 'men' as AdminScope, label: 'Masculino' },
            { value: 'women' as AdminScope, label: 'Femenino' },
          ]} />

          {view === 'matches' ? (
            <>
              {categories.map((category) => (
                <DisciplineNotice
                  key={category}
                  rows={calculateDiscipline(category, events)}
                  teams={teams}
                />
              ))}
              <section className={styles.section}>
                <h2>Partidos{scopeLabel}</h2>
                <p className={styles.hint}>Tocá un partido para cargar su resultado, quiénes jugaron y qué pasó.</p>
                <div className={styles.matchList}>{scopedMatches.map((match) => (
                  <MatchRow
                    key={match.id}
                    match={match}
                    teams={teams}
                    progress={getMatchProgress(match, rosters, events)}
                    showCategory={bothTournaments}
                    onOpen={() => setOpenMatchId(match.id)}
                  />
                ))}</div>
              </section>
              {isOwner && (
                <section className={styles.section}>
                  <h2>Crear partido</h2>
                  {bothTournaments
                    ? <p className={styles.hint}>Elegí Masculino o Femenino para crear un partido.</p>
                    : <MatchForm category={scope as Category} teams={scopedTeams} onSaved={() => notify('Partido creado.')} />}
                </section>
              )}
            </>
          ) : isOwner && (
            <>
              <section className={styles.section}>
                <h2>Equipos{scopeLabel}</h2>
                <p className={styles.hint}>Se mantienen seis equipos masculinos y cinco femeninos.</p>
                <div className={styles.teamList}>{scopedTeams.map((team, index) => (
                  <TeamEditor key={team.id} team={team} position={index + 1} onSaved={() => notify('Equipo actualizado.')} />
                ))}</div>
              </section>
              <SquadsAdmin
                teams={scopedTeams}
                players={players.filter((player) => categories.includes(player.category))}
                notify={notify}
              />
            </>
          )}

          {isOwner && dataPublished && <FixturePublisher notify={notify} />}
          {isOwner && <AdminManager currentEmail={user?.email ?? ''} notify={notify} />}
        </>
      )}

      {message && <div className={styles.toast} role="status">{message}</div>}
      <a className={styles.publicLink} href="./">Ver sitio público</a>
    </main>
  )
}

// One line per match, saying at a glance what it still needs. The official code is
// first because that is what the operator reads off the top of the paper sheet.
function MatchRow({ match, teams, progress, showCategory, onOpen }: {
  match: Match; teams: Team[]; progress: MatchProgress; showCategory: boolean; onOpen: () => void
}) {
  const code = getMatchCode(match.id)
  const pending = [
    ...(progress.hasResult ? [] : ['falta el resultado']),
    ...(progress.calledUp ? [] : ['falta quiénes jugaron']),
    ...(progress.events ? [] : ['falta qué pasó']),
    ...(progress.pending ? [`${progress.pending} sin completar`] : []),
  ]
  return (
    <button type="button" id={`match-${match.id}`} className={styles.matchRow} onClick={onOpen}>
      <span className={styles.matchCode}>{code || stageLabels[match.stage]}</span>
      <span className={styles.matchName}>{getMatchName(match, teams)}</span>
      {progress.hasResult && (
        <span className={styles.finalScore}>{match.homeScore}<i>-</i>{match.awayScore}</span>
      )}
      <span className={styles.matchMeta}>
        {showCategory ? `${tournamentConfigs[match.category].shortName} · ` : ''}
        {formatShortDay(match.startDateTime, TIMEZONE)} · {formatTime(match.startDateTime, TIMEZONE)}
        {code && match.stage !== 'regular' ? ` · ${stageLabels[match.stage]}` : ''}
      </span>
      <span className={`${styles.badge} ${progress.done ? styles.badgeDone : styles.badgeTodo}`}>
        {progress.done ? 'Completo' : pending.join(' · ') || 'Sin cargar'}
      </span>
      <span className={styles.go} aria-hidden="true">›</span>
    </button>
  )
}

// Everything one scoresheet says, in the order it says it: the result, who dressed,
// and what happened. Numbered because the operator does them in that order and the
// second step is what makes the third one possible.
function MatchWorkspace({ match, published, teams, players, rosters, events, canReschedule, onBack, notify }: {
  match: Match; published: Match; teams: Team[]; players: Player[]
  rosters: MatchRosterEntry[]; events: MatchEvent[]
  canReschedule: boolean; onBack: () => void; notify: (message: string) => void
}) {
  // '' is the match itself; 'nuevo' or an event id is the editor. One thing on screen
  // at a time, the same as the list and the match.
  const [editing, setEditing] = useState('')
  // Held here, not inside Step, so a step stays open across a trip to the editor.
  const [openSteps, setOpenSteps] = useState<number[]>([])
  const toggleStep = (step: number) => () =>
    setOpenSteps((current) => current.includes(step) ? current.filter((item) => item !== step) : [...current, step])
  const editedEvent = events.find((event) => event.id === editing)
  const progress = getMatchProgress(match, rosters, events)
  const goalkeepers = rosters.filter(hasGoalkeeperLine).length
  const code = getMatchCode(match.id)
  const where = (
    <span>
      {code ? `Partido ${code} · ` : ''}{tournamentConfigs[match.category].shortName}
      {match.stage === 'regular' ? '' : ` · ${stageLabels[match.stage]}`}
    </span>
  )

  if (editing) {
    const close = () => setEditing('')
    return (
      <>
        <button type="button" className={styles.back} onClick={close}>‹ Volver al partido</button>
        <div className={styles.workspaceHead}>
          {where}
          <h2>{editedEvent ? 'Corregir el evento' : 'Cargar un gol o una falta'}</h2>
          <p>{getMatchName(match, teams)}</p>
        </div>
        <section className={styles.section}>
          <p className={styles.hint}>
            Copiá los datos como los escribe la planilla. Lo que no se entienda, dejalo en blanco.
          </p>
          <EventForm
            key={editedEvent?.id ?? `${match.id}-nuevo`}
            match={match}
            teams={teams}
            players={players}
            entries={rosters}
            edited={editedEvent}
            onSaved={() => { close(); notify(editedEvent ? 'Evento corregido.' : 'Evento cargado.') }}
            onCancel={close}
          />
        </section>
      </>
    )
  }

  return (
    <>
      <button type="button" className={styles.back} onClick={onBack}>‹ Volver a los partidos</button>
      <div className={styles.workspaceHead}>
        {where}
        <h2>{getMatchName(match, teams)}</h2>
        <p>{formatDay(match.startDateTime, TIMEZONE)} · {formatTime(match.startDateTime, TIMEZONE)}</p>
      </div>

      <Step number={1} title="El resultado" done={progress.hasResult}>
        <MatchResultForm
          match={match}
          published={published}
          teams={teams}
          canReschedule={canReschedule}
          onSaved={(what) => notify(what)}
        />
      </Step>

      <Step
        number={2}
        title="Quiénes jugaron"
        done={progress.calledUp > 0}
        detail={progress.calledUp ? `${progress.calledUp} anotados` : 'sin cargar'}
        open={openSteps.includes(2)}
        onToggle={toggleStep(2)}
      >
        <p className={styles.hint}>
          Copiá las dos listas de la planilla con el número que usó cada uno ese día.
          Sin esto, el paso 3 no puede saber de quién es cada casaca.
        </p>
        <MatchRosterForm
          match={match}
          teams={teams}
          players={players}
          entries={rosters}
          onSaved={() => notify('Convocatoria actualizada.')}
        />
      </Step>

      <Step
        number={3}
        title="Qué pasó"
        done={progress.events > 0 && progress.pending === 0}
        detail={progress.events ? `${progress.events} cargados${progress.pending ? `, ${progress.pending} sin completar` : ''}` : 'sin cargar'}
        open={openSteps.includes(3)}
        onToggle={toggleStep(3)}
      >
        <MatchEventList
          match={match}
          teams={teams}
          events={events}
          rosters={rosters}
          onEdit={setEditing}
        />
        <button type="button" className={styles.add} onClick={() => setEditing('nuevo')}>
          + Cargar un gol o una falta
        </button>
      </Step>

      <Step
        number={4}
        title="Los arqueros"
        done={goalkeepers > 0}
        detail={goalkeepers ? `${goalkeepers} cargados` : 'sin cargar'}
        open={openSteps.includes(4)}
        onToggle={toggleStep(4)}
      >
        <p className={styles.hint}>
          Del pie de la planilla: los minutos, las atajadas y los goles recibidos.
          Los tiros al arco se calculan solos.
        </p>
        <GoalkeeperForm
          teams={teams}
          entries={rosters}
          onSaved={() => notify('Arquero actualizado.')}
        />
      </Step>
    </>
  )
}

// The long steps fold away, because a match screen with two full lists on it is a wall.
// The heading wraps the toggle rather than the other way round, so the step is still a
// heading to anybody navigating by headings.
function Step({ number, title, done, detail, open, onToggle, children }: {
  number: number; title: string; done: boolean; detail?: string
  open?: boolean; onToggle?: () => void; children: ReactNode
}) {
  const panelId = `step-${number}`
  const inside = (
    <>
      <span className={`${styles.stepNumber} ${done ? styles.stepDone : ''}`}>{done ? '✓' : number}</span>
      <span className={styles.stepTitle}>{title}</span>
      {detail && <span className={styles.stepDetail}>{detail}</span>}
      {onToggle && <Chevron open={Boolean(open)} />}
    </>
  )
  return (
    <section className={styles.section}>
      <h2 className={styles.stepHead}>
        {onToggle ? (
          <button type="button" className={styles.stepToggle} aria-expanded={open} aria-controls={panelId} onClick={onToggle}>
            {inside}
          </button>
        ) : inside}
      </h2>
      <div id={panelId} hidden={Boolean(onToggle) && !open}>{children}</div>
    </section>
  )
}

function Chevron({ open }: { open: boolean }) {
  return (
    <svg className={`${styles.chevron} ${open ? styles.chevronOpen : ''}`} viewBox="0 0 16 16" aria-hidden="true">
      <path d="M4 6l4 4 4-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function SquadsAdmin({ teams, players, notify }: {
  teams: Team[]; players: Player[]; notify: (message: string) => void
}) {
  return (
    <section className={styles.section}>
      <h2>Planteles</h2>
      <p className={styles.hint}>
        Quiénes están inscriptos en cada club. Quiénes jugaron cada partido se carga adentro del partido.
        Dar de baja oculta al jugador sin perder las estadísticas que ya tenga.
      </p>
      <PlayerForm teams={teams} onSaved={() => notify('Jugador/a agregado/a.')} />
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
    </section>
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

// `match` carries the derived playoff participants, so the form can name the teams.
// `published` is the document as Firestore holds it, and is what gets written back.
function MatchResultForm({ match, published, teams, canReschedule = false, onSaved }: {
  match: Match; published: Match; teams: Team[]; canReschedule?: boolean
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
    await saveMatch({ ...published, startDateTime, homeScore, awayScore, resolution: resolved })
    void track('admin_action', { action: moved ? 'reschedule_match' : 'save_result', resolution: resolved })
    onSaved(moved ? 'Partido reprogramado.' : 'Resultado actualizado.')
  }
  return (
    <form onSubmit={submit}>
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

// The same running order the public card shows, so a wrong reading of the paper
// scoresheet is obvious here before anybody else sees it.
function MatchEventList({ match, teams, events, rosters, onEdit }: {
  match: Match; teams: Team[]; events: MatchEvent[]; rosters: MatchRosterEntry[]
  onEdit: (eventId: string) => void
}) {
  const lines = buildMatchSummary(match.id, events, teams, rosters)
  if (!lines.length) return <p className={styles.hint}>Todavía no hay eventos cargados en este partido.</p>
  const pending = lines.filter((line) => line.missing.length || line.notes).length
  return (
    <>
    {pending > 0 && <p className={styles.hint}>
      {pending === 1 ? 'Hay 1 evento' : `Hay ${pending} eventos`} con datos que la planilla no dejaba leer.
      Editalos para completarlos a mano.
    </p>}
    <div className={styles.events}>{lines.map((line) => (
      <div key={line.id}>
        <span>
          {/* The played time is what the site shows; the countdown is what the paper
              says, so both are here to be compared against the scoresheet. */}
          <strong>{line.period ? `P${line.period}` : '—'} {line.elapsed ?? ''}</strong>
          {line.remaining && line.remaining !== line.elapsed && <em className={styles.remaining}> (quedaban {line.remaining})</em>}
          {' · '}{eventTypeLabels[line.type]}{line.penaltyMinutes ? ` ${line.penaltyMinutes}'` : ''}
          {' · '}{line.teamName}
          {' · '}{line.player}
          {line.assists.length > 0 && ` · asist. ${line.assists.join(', ')}`}
          {line.missing.length > 0 && <em className={styles.missing}> falta {line.missing.join(', ')}</em>}
          {line.notes && <em className={styles.note}>{line.notes}</em>}
        </span>
        <span className={styles.rowActions}>
          <button type="button" className={styles.secondary} onClick={() => onEdit(line.id)}>Editar</button>
          <button type="button" className={styles.danger} onClick={() => removeMatchEvent(line.id)}>Eliminar</button>
        </span>
      </div>
    ))}</div>
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

// The scoresheet keeps goalkeeping in its own footer block, apart from the call-up,
// so it is loaded apart too. Shots on target are never entered: they are the saves
// plus the goals conceded, and asking for all three would let them disagree.
function GoalkeeperForm({ teams, entries, onSaved }: {
  teams: Team[]; entries: MatchRosterEntry[]; onSaved: () => void
}) {
  const [playerId, setPlayerId] = useState('')
  const [minutes, setMinutes] = useState('')
  const [saves, setSaves] = useState('')
  const [goalsAgainst, setGoalsAgainst] = useState('')
  const chosen = entries.find((entry) => entry.playerId === playerId)
  const teamName = (id: string) => teams.find((team) => team.id === id)?.name ?? id

  const pick = (id: string) => {
    setPlayerId(id)
    const entry = entries.find((item) => item.playerId === id)
    setMinutes(entry?.minutesPlayed?.toString() ?? '')
    setSaves(entry?.saves?.toString() ?? '')
    setGoalsAgainst(entry?.goalsAgainst?.toString() ?? '')
  }

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    if (!chosen) return
    await saveMatchRosterEntry({
      ...chosen,
      minutesPlayed: numberOr(minutes),
      saves: numberOr(saves),
      goalsAgainst: numberOr(goalsAgainst),
    })
    void track('admin_action', { action: 'save_goalkeeper_line' })
    setPlayerId(''); setMinutes(''); setSaves(''); setGoalsAgainst(''); onSaved()
  }

  const loaded = entries.filter(hasGoalkeeperLine)
  return (
    <>
      {entries.length === 0 ? (
        <p className={styles.hint}>Cargá primero quiénes jugaron: el arquero sale de esa lista.</p>
      ) : (
        <form className={styles.eventForm} onSubmit={submit}>
          <label>Arquero/a<select required value={playerId} onChange={(event) => pick(event.target.value)}>
            <option value="">Seleccionar…</option>
            {[...entries].sort((a, b) => a.jerseyNumber - b.jerseyNumber).map((entry) => (
              <option key={entry.id} value={entry.playerId}>
                #{entry.jerseyNumber} · {entry.playerName} · {teamName(entry.teamId)}
              </option>
            ))}
          </select></label>
          <label>Minutos jugados<input type="number" min="0" placeholder="en blanco si no figura" value={minutes} onChange={(event) => setMinutes(event.target.value)} /></label>
          <label>Atajadas<input type="number" min="0" placeholder="en blanco si no figura" value={saves} onChange={(event) => setSaves(event.target.value)} /></label>
          <label>Goles recibidos<input type="number" min="0" placeholder="en blanco si no figura" value={goalsAgainst} onChange={(event) => setGoalsAgainst(event.target.value)} /></label>
          <button type="submit">Guardar el arquero</button>
        </form>
      )}
      <div className={styles.events}>{loaded.map((entry) => {
        const shots = (entry.saves ?? 0) + (entry.goalsAgainst ?? 0)
        return (
          <div key={entry.id}>
            <span>
              <strong>#{entry.jerseyNumber} {entry.playerName}</strong> · {teamName(entry.teamId)}
              {' · '}{entry.saves ?? 0} atajadas · {entry.goalsAgainst ?? 0} recibidos · {shots} tiros
              {entry.minutesPlayed !== undefined ? ` · ${entry.minutesPlayed} min` : ''}
            </span>
            <button type="button" className={styles.secondary} onClick={() => pick(entry.playerId)}>Editar</button>
          </div>
        )
      })}</div>
    </>
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

// One person on an event: the jersey number as the scoresheet wrote it, and the player
// it resolves to. Typing the number picks the player out of this match's call-up, which
// is the only place a number means anything. A number nobody claims stays unassigned
// instead of blocking the whole event.
function PersonFields({ label, jersey, playerId, onJersey, onPlayer, choices, optional }: {
  label: string; jersey: string; playerId: string
  onJersey: (value: string) => void; onPlayer: (value: string) => void
  choices: { id: string; name: string; jerseyNumber?: number }[]; optional?: boolean
}) {
  const resolved = choices.find((choice) => choice.id === playerId)
  return (
    <>
      <label>{label} · casaca<input
        type="number" min="0" inputMode="numeric" placeholder={optional ? 'sin asistencia' : 'Ej. 92'}
        value={jersey} onChange={(event) => onJersey(event.target.value)}
      /></label>
      <label>{label}<select value={playerId} onChange={(event) => onPlayer(event.target.value)}>
        <option value="">{jersey ? `#${jersey} · sin asignar` : optional ? 'Sin asistencia' : 'Sin asignar'}</option>
        {choices.map((choice) => (
          <option key={choice.id} value={choice.id}>
            {choice.jerseyNumber !== undefined ? `#${choice.jerseyNumber} · ` : ''}{choice.name}
          </option>
        ))}
      </select>{!resolved && jersey && <span className={styles.pendingHint}>Esa casaca no está en la convocatoria.</span>}</label>
    </>
  )
}

// Loads a published event back into its own fields so a misread scoresheet can be
// corrected in place. Saving keeps the document ID, so the correction replaces the
// event instead of leaving the wrong one behind next to a duplicate.
function EventForm({ match, teams, players, entries, edited, onSaved, onCancel }: {
  match: Match; teams: Team[]; players: Player[]; entries: MatchRosterEntry[]
  edited?: MatchEvent; onSaved: () => void; onCancel: () => void
}) {
  const eligibleTeams = useMemo(() => teams.filter((team) => team.id === match.homeTeamId || team.id === match.awayTeamId), [match, teams])
  const [type, setType] = useState<MatchEventType>(edited?.type ?? 'goal')
  const [chosenTeamId, setTeamId] = useState(edited?.teamId ?? '')
  const [player, setPlayer] = useState(person(edited?.playerId, edited?.jerseyNumber))
  const [assist, setAssist] = useState(person(edited?.assistId, edited?.assistJerseyNumber))
  const [secondAssist, setSecondAssist] = useState(person(edited?.secondAssistId, edited?.secondAssistJerseyNumber))
  // Kept as text so the scoresheet's own blanks survive: an unreadable period is
  // empty, not period one.
  const [period, setPeriod] = useState(edited?.period?.toString() ?? '')
  const [gameTime, setGameTime] = useState(edited?.gameTime ?? '')
  const [notes, setNotes] = useState(edited?.notes ?? '')
  const [penaltyMinutes, setPenaltyMinutes] = useState(edited?.penaltyMinutes?.toString() ?? (edited ? '' : '2'))
  // Derived rather than stored, because the teams arrive from Firestore after the
  // form is already on screen and a stored default would keep the first empty value.
  const teamId = eligibleTeams.some((team) => team.id === chosenTeamId) ? chosenTeamId : eligibleTeams[0]?.id ?? ''
  const choices = entries
    .filter((entry) => entry.teamId === teamId)
    .map((entry) => ({ entry, player: players.find((item) => item.id === entry.playerId) }))
    // A player dropped from the squad keeps the events already published in their
    // name, so correcting one of those must still offer them.
    .filter(({ player: found }) => Boolean(found?.active || (found && found.id === edited?.playerId)))
    .map(({ entry, player: found }) => ({ id: found!.id, name: found!.name, jerseyNumber: entry.jerseyNumber }))
    .sort((a, b) => a.jerseyNumber - b.jerseyNumber)

  // Typing a number is the normal path, so it resolves the player by itself.
  const setJersey = (set: typeof setPlayer) => (value: string) =>
    set({ jersey: value, playerId: choices.find((choice) => choice.jerseyNumber === Number(value))?.id ?? '' })

  const changeTeam = (next: string) => {
    setTeamId(next)
    setPlayer(person()); setAssist(person()); setSecondAssist(person())
  }

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    // A number with nobody behind it is still a real event, so only a completely
    // empty person is refused.
    if (!teamId || (!player.playerId && !player.jersey.trim())) return
    const named = (chosen: Person) => players.find((item) => item.id === chosen.playerId)
    const onGoal = <T,>(value: T) => (type === 'goal' ? value : undefined)
    await saveMatchEvent({
      id: edited?.id ?? crypto.randomUUID(), matchId: match.id, category: match.category, teamId, type,
      playerId: player.playerId || undefined,
      playerName: named(player)?.name ?? '',
      jerseyNumber: numberOr(player.jersey),
      assistId: onGoal(assist.playerId || undefined), assistName: onGoal(named(assist)?.name),
      assistJerseyNumber: onGoal(numberOr(assist.jersey)),
      secondAssistId: onGoal(secondAssist.playerId || undefined), secondAssistName: onGoal(named(secondAssist)?.name),
      secondAssistJerseyNumber: onGoal(numberOr(secondAssist.jersey)),
      period: numberOr(period), gameTime: gameTime.trim() || undefined,
      penaltyMinutes: type === 'goal' ? undefined : numberOr(penaltyMinutes),
      notes: notes.trim() || undefined,
    })
    void track('admin_action', { action: edited ? 'edit_event' : 'publish_event', event_type: type })
    setPlayer(person()); setAssist(person()); setSecondAssist(person()); setGameTime(''); setNotes(''); onSaved()
  }
  return (
    <form className={styles.eventForm} onSubmit={submit}>
      <label>Tipo<select value={type} onChange={(event) => setType(event.target.value as MatchEventType)}>{eventTypes.map((value) => <option key={value} value={value}>{eventTypeLabels[value]}</option>)}</select></label>
      <label>Equipo<select value={teamId} onChange={(event) => changeTeam(event.target.value)}>{eligibleTeams.map((team) => <option key={team.id} value={team.id}>{team.name}</option>)}</select></label>
      <PersonFields
        label="Jugador/a" jersey={player.jersey} playerId={player.playerId}
        onJersey={setJersey(setPlayer)} onPlayer={(id) => setPlayer({ ...player, playerId: id })}
        choices={choices}
      />
      {type === 'goal' ? <>
        <PersonFields
          label="1.ª asistencia" jersey={assist.jersey} playerId={assist.playerId}
          onJersey={setJersey(setAssist)} onPlayer={(id) => setAssist({ ...assist, playerId: id })}
          choices={choices.filter((choice) => choice.id !== player.playerId)} optional
        />
        <PersonFields
          label="2.ª asistencia" jersey={secondAssist.jersey} playerId={secondAssist.playerId}
          onJersey={setJersey(setSecondAssist)} onPlayer={(id) => setSecondAssist({ ...secondAssist, playerId: id })}
          choices={choices.filter((choice) => choice.id !== player.playerId && choice.id !== assist.playerId)} optional
        />
      </> : <label>Minutos de penalización<input type="number" min="0" placeholder="en blanco si no figura" value={penaltyMinutes} onChange={(event) => setPenaltyMinutes(event.target.value)} /></label>}
      <label>Período<input type="number" min="1" max={REGULATION_PERIODS + 1} placeholder="en blanco si no figura" value={period} onChange={(event) => setPeriod(event.target.value)} /></label>
      {/* Copied straight off the sheet. The site converts it to time played. */}
      <label>Reloj restante<input placeholder="Ej. 2:43" pattern="[0-9]{1,2}:[0-9]{2}" value={gameTime} onChange={(event) => setGameTime(event.target.value)} /></label>
      {/* Lo que la planilla dice y no entra en ningún campo. Se borra al resolverlo. */}
      <label>Nota de la planilla<input value={notes} onChange={(event) => setNotes(event.target.value)} /></label>
      <button type="submit">{edited ? 'Guardar corrección' : 'Cargar el evento'}</button>
      {edited && <button type="button" className={styles.secondary} onClick={onCancel}>Cancelar</button>}
    </form>
  )
}
