import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { onAuthStateChanged, signInWithPopup, signOut, type User } from 'firebase/auth'
import { ADMIN_EMAIL, auth, googleProvider } from '../firebase'
import { removeMatchEvent, saveMatch, saveMatchEvent, seedFirestore } from '../data/firestore'
import { teams } from '../data/teams'
import { useTournamentData } from '../hooks/useTournamentData'
import type { Match, MatchEventType, MatchStatus } from '../types/tournament'
import styles from './AdminApp.module.css'

const statuses: MatchStatus[] = ['upcoming', 'live', 'finished', 'postponed', 'tbd']
const eventTypes: MatchEventType[] = ['goal', 'penalty', 'major-penalty']

export function AdminApp() {
  const { matches, events } = useTournamentData()
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
        <h2>Goles, asistencias y faltas</h2>
        <label>Partido<select value={selectedMatchId} onChange={(event) => setSelectedMatchId(event.target.value)}><option value="">Seleccionar…</option>{matches.map((match) => <option key={match.id} value={match.id}>{match.id} · {match.startDateTime.slice(0, 16).replace('T', ' ')}</option>)}</select></label>
        {selectedMatch && <EventForm match={selectedMatch} onSaved={() => setMessage('Estadística publicada.')} />}
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
    const finished = draft.status === 'finished'
    await saveMatch({ ...draft, homeScore: finished ? draft.homeScore : draft.homeScore, awayScore: finished ? draft.awayScore : draft.awayScore })
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

function EventForm({ match, onSaved }: { match: Match; onSaved: () => void }) {
  const eligibleTeams = useMemo(() => teams.filter((team) => team.id === match.homeTeamId || team.id === match.awayTeamId), [match])
  const [type, setType] = useState<MatchEventType>('goal')
  const [teamId, setTeamId] = useState(eligibleTeams[0]?.id ?? '')
  const [playerName, setPlayerName] = useState('')
  const [assistName, setAssistName] = useState('')
  const [penaltyMinutes, setPenaltyMinutes] = useState(2)
  useEffect(() => setTeamId(eligibleTeams[0]?.id ?? ''), [eligibleTeams])
  const submit = async (event: FormEvent) => {
    event.preventDefault()
    if (!playerName.trim() || !teamId) return
    await saveMatchEvent({
      id: crypto.randomUUID(), matchId: match.id, category: match.category, teamId, type,
      playerName: playerName.trim(), assistName: type === 'goal' ? assistName.trim() || undefined : undefined,
      penaltyMinutes: type === 'goal' ? undefined : penaltyMinutes,
    })
    setPlayerName(''); setAssistName(''); onSaved()
  }
  return (
    <form className={styles.eventForm} onSubmit={submit}>
      <label>Tipo<select value={type} onChange={(event) => setType(event.target.value as MatchEventType)}>{eventTypes.map((value) => <option key={value} value={value}>{value === 'goal' ? 'Gol' : value === 'penalty' ? 'Falta' : 'Falta grave'}</option>)}</select></label>
      <label>Equipo<select value={teamId} onChange={(event) => setTeamId(event.target.value)}>{eligibleTeams.map((team) => <option key={team.id} value={team.id}>{team.name}</option>)}</select></label>
      <label>Jugador/a<input required value={playerName} onChange={(event) => setPlayerName(event.target.value)} /></label>
      {type === 'goal' ? <label>Asistencia (opcional)<input value={assistName} onChange={(event) => setAssistName(event.target.value)} /></label> : <label>Minutos<input type="number" min="0" value={penaltyMinutes} onChange={(event) => setPenaltyMinutes(Number(event.target.value))} /></label>}
      <button type="submit">Publicar evento</button>
    </form>
  )
}
