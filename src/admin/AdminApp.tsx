import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { onAuthStateChanged, signInWithPopup, signOut, type User } from 'firebase/auth'
import { ADMIN_EMAIL, auth, googleProvider } from '../firebase'
import { removeMatchEvent, removePlayer, saveMatch, saveMatchEvent, savePlayer, seedFirestore } from '../data/firestore'
import { useTournamentData } from '../hooks/useTournamentData'
import type { Match, MatchEventType, MatchStatus, Player, Team } from '../types/tournament'
import styles from './AdminApp.module.css'

const statuses: MatchStatus[] = ['upcoming', 'live', 'finished', 'postponed', 'tbd']
const eventTypes: MatchEventType[] = ['goal', 'penalty', 'major-penalty']

export function AdminApp() {
  const { matches, teams, players, events } = useTournamentData()
  const [user, setUser] = useState<User | null>(null)
  const [message, setMessage] = useState('')
  const [selectedMatchId, setSelectedMatchId] = useState('')

  useEffect(() => onAuthStateChanged(auth, setUser), [])
  const isAdmin = user?.email === ADMIN_EMAIL
  const selectedMatch = matches.find((match) => match.id === selectedMatchId)

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
        <p>Ingresá con la cuenta autorizada para actualizar partidos y estadísticas.</p>
        <button type="button" onClick={login}>Ingresar con Google</button>
        {message && <p className={styles.error}>{message}</p>}
        <a href="./">Volver al sitio público</a>
      </div>
    </main>
  )

  return (
    <main className={styles.admin}>
      <header>
        <div><span>CFM Ushuaia Hockey</span><h1>Panel de administración</h1></div>
        <button type="button" className={styles.secondary} onClick={() => signOut(auth)}>Salir</button>
      </header>
      <p className={styles.notice}>Sesión: {user.email}. Los cambios se publican inmediatamente.</p>
      <section className={styles.section}>
        <div className={styles.sectionTitle}><h2>Partidos</h2><button type="button" className={styles.secondary} onClick={async () => { await seedFirestore(); setMessage('Datos iniciales cargados.') }}>Cargar datos iniciales</button></div>
        <div className={styles.matchList}>{matches.map((match) => <MatchEditor key={match.id} match={match} onSaved={() => setMessage('Partido actualizado.')} />)}</div>
      </section>
      <section className={styles.section}>
        <h2>Planteles</h2>
        <PlayerForm teams={teams} onSaved={() => setMessage('Jugador/a guardado/a.')} />
        <div className={styles.events}>{players.map((player) => <div key={player.id}><span><strong>{player.name}</strong> · #{player.number ?? '—'} · {teams.find((team) => team.id === player.teamId)?.name}</span><button type="button" className={styles.danger} onClick={() => removePlayer(player.id)}>Eliminar</button></div>)}</div>
      </section>
      <section className={styles.section}>
        <h2>Goles, asistencias y faltas</h2>
        <label>Partido<select value={selectedMatchId} onChange={(event) => setSelectedMatchId(event.target.value)}><option value="">Seleccionar…</option>{matches.map((match) => <option key={match.id} value={match.id}>{match.id} · {match.startDateTime.slice(0, 16).replace('T', ' ')}</option>)}</select></label>
        {selectedMatch && <EventForm match={selectedMatch} teams={teams} players={players} onSaved={() => setMessage('Estadística publicada.')} />}
        <div className={styles.events}>{events.map((event) => <div key={event.id}><span><strong>{event.playerName}</strong> · {event.type} · {event.matchId}</span><button type="button" className={styles.danger} onClick={() => removeMatchEvent(event.id)}>Eliminar</button></div>)}</div>
      </section>
      {message && <div className={styles.toast} role="status">{message}</div>}
      <a className={styles.publicLink} href="./">Ver sitio público</a>
    </main>
  )
}

function MatchEditor({ match, onSaved }: { match: Match; onSaved: () => void }) {
  const [draft, setDraft] = useState(match)
  useEffect(() => setDraft(match), [match])
  const submit = async (event: FormEvent) => {
    event.preventDefault()
    await saveMatch(draft)
    onSaved()
  }
  return (
    <form className={styles.match} onSubmit={submit}>
      <strong>{match.id}</strong>
      <select aria-label={`Estado ${match.id}`} value={draft.status} onChange={(event) => setDraft({ ...draft, status: event.target.value as MatchStatus })}>{statuses.map((status) => <option key={status}>{status}</option>)}</select>
      <input aria-label={`Goles local ${match.id}`} type="number" min="0" placeholder="Local" value={draft.homeScore ?? ''} onChange={(event) => setDraft({ ...draft, homeScore: event.target.value === '' ? null : Number(event.target.value) })} />
      <input aria-label={`Goles visita ${match.id}`} type="number" min="0" placeholder="Visita" value={draft.awayScore ?? ''} onChange={(event) => setDraft({ ...draft, awayScore: event.target.value === '' ? null : Number(event.target.value) })} />
      <button type="submit">Guardar</button>
    </form>
  )
}

function PlayerForm({ teams, onSaved }: { teams: Team[]; onSaved: () => void }) {
  const [teamId, setTeamId] = useState(teams[0]?.id ?? '')
  const [name, setName] = useState('')
  const [number, setNumber] = useState('')
  const submit = async (event: FormEvent) => {
    event.preventDefault()
    if (!name.trim() || !teamId) return
    await savePlayer({
      id: crypto.randomUUID(), category: teams.find((team) => team.id === teamId)!.category,
      teamId, name: name.trim(), number: number === '' ? undefined : Number(number), active: true,
    })
    setName(''); setNumber(''); onSaved()
  }
  return (
    <form className={styles.eventForm} onSubmit={submit}>
      <label>Equipo<select value={teamId} onChange={(event) => setTeamId(event.target.value)}>{teams.map((team) => <option key={team.id} value={team.id}>{team.name} · {team.category === 'men' ? 'Masculino' : 'Femenino'}</option>)}</select></label>
      <label>Nombre<input required value={name} onChange={(event) => setName(event.target.value)} /></label>
      <label>Número<input type="number" min="0" value={number} onChange={(event) => setNumber(event.target.value)} /></label>
      <button type="submit">Agregar al plantel</button>
    </form>
  )
}

function EventForm({ match, teams, players, onSaved }: { match: Match; teams: Team[]; players: Player[]; onSaved: () => void }) {
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
  const eligiblePlayers = players.filter((player) => player.teamId === teamId && player.active)
  useEffect(() => { setPlayerId(''); setAssistId(''); setSecondAssistId('') }, [teamId])
  const submit = async (event: FormEvent) => {
    event.preventDefault()
    const player = players.find((item) => item.id === playerId)
    if (!player || !teamId) return
    const assist = players.find((item) => item.id === assistId)
    const secondAssist = players.find((item) => item.id === secondAssistId)
    await saveMatchEvent({
      id: crypto.randomUUID(), matchId: match.id, category: match.category, teamId, type,
      playerId: player.id, playerName: player.name,
      assistId: type === 'goal' ? assist?.id : undefined, assistName: type === 'goal' ? assist?.name : undefined,
      secondAssistId: type === 'goal' ? secondAssist?.id : undefined, secondAssistName: type === 'goal' ? secondAssist?.name : undefined,
      period, gameTime: gameTime.trim() || undefined,
      penaltyMinutes: type === 'goal' ? undefined : penaltyMinutes,
    })
    setPlayerId(''); setAssistId(''); setSecondAssistId(''); setGameTime(''); onSaved()
  }
  return (
    <form className={styles.eventForm} onSubmit={submit}>
      <label>Tipo<select value={type} onChange={(event) => setType(event.target.value as MatchEventType)}>{eventTypes.map((value) => <option key={value} value={value}>{value === 'goal' ? 'Gol' : value === 'penalty' ? 'Falta' : 'Falta grave'}</option>)}</select></label>
      <label>Equipo<select value={teamId} onChange={(event) => setTeamId(event.target.value)}>{eligibleTeams.map((team) => <option key={team.id} value={team.id}>{team.name}</option>)}</select></label>
      <label>Jugador/a<select required value={playerId} onChange={(event) => setPlayerId(event.target.value)}><option value="">Seleccionar…</option>{eligiblePlayers.map((player) => <option key={player.id} value={player.id}>#{player.number ?? '—'} · {player.name}</option>)}</select></label>
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
