import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  setDoc,
  writeBatch,
  type Unsubscribe,
} from 'firebase/firestore'
import { matches as seedMatches } from './matches'
import { matchRosters as seedRosters } from './matchRosters'
import { matchEvents as seedEvents } from './matchEvents'
import { players as seedPlayers } from './players'
import { teams as seedTeams } from './teams'
import { OWNER_EMAIL, db } from '../firebase'
import type { Match, MatchEvent, MatchRosterEntry, Player, Team } from '../types/tournament'
import { adminDocId, sortAdminEmails, type AdminRole } from '../utils/admins'

export interface AdminEntry {
  email: string
  role: AdminRole
}

// The founding owner outranks the list, which is also what firestore.rules says.
export async function getAdminRole(email: string | null | undefined): Promise<AdminRole | null> {
  if (!email) return null
  const id = adminDocId(email)
  if (id === adminDocId(OWNER_EMAIL)) return 'owner'
  const entry = await getDoc(doc(db, 'admins', id))
  if (!entry.exists()) return null
  return entry.data().role === 'owner' ? 'owner' : 'editor'
}

// Only an administrator may list the collection, so a denied read means "not one".
export const subscribeToAdmins = (onAdmins: (entries: AdminEntry[]) => void, onError: () => void) =>
  onSnapshot(
    collection(db, 'admins'),
    (snapshot) => {
      const byEmail = new Map(snapshot.docs.map((item) => [item.id, item.data().role as AdminRole]))
      onAdmins(sortAdminEmails([...byEmail.keys()]).map((email) => ({
        email,
        role: byEmail.get(email) === 'owner' ? 'owner' : 'editor',
      })))
    },
    onError,
  )

export const saveAdmin = (email: string, role: AdminRole) =>
  setDoc(doc(db, 'admins', adminDocId(email)), { email: adminDocId(email), role })

export const removeAdmin = (email: string) => deleteDoc(doc(db, 'admins', adminDocId(email)))

export const subscribeToTournamentData = (
  onMatches: (matches: Match[]) => void,
  onTeams: (teams: Team[]) => void,
  onPlayers: (players: Player[]) => void,
  onRosters: (rosters: MatchRosterEntry[]) => void,
  onEvents: (events: MatchEvent[]) => void,
  onError: () => void,
  // The public site never subscribes to the squads, the call-ups and the events. They
  // are the whole tournament's history, about a thousand documents, and Firestore
  // charges one read per document on every single page load. They ship inside the
  // build instead, which the CDN serves for free. Only the panel, which edits them,
  // needs them live.
  { detail = false }: { detail?: boolean } = {},
): Unsubscribe => {
  const unsubscribes = [
    onSnapshot(collection(db, 'matches'), (snapshot) => {
      const remote = snapshot.docs.map((item) => item.data() as Match)
      onMatches(remote.length ? remote : seedMatches)
    }, onError),
    onSnapshot(collection(db, 'teams'), (snapshot) => {
      const remote = snapshot.docs.map((item) => item.data() as Team)
      onTeams(remote.length ? remote : seedTeams)
    }, onError),
    ...(detail ? [
      onSnapshot(collection(db, 'players'), (snapshot) => {
        onPlayers(snapshot.docs.map((item) => item.data() as Player))
      }, onError),
      // An empty collection means the tournament has not been loaded yet, not that
      // nobody played, so it falls back to the versioned copy like matches and teams.
      onSnapshot(collection(db, 'matchRosters'), (snapshot) => {
        const remote = snapshot.docs.map((item) => item.data() as MatchRosterEntry)
        onRosters(remote.length ? remote : seedRosters)
      }, onError),
      onSnapshot(collection(db, 'matchEvents'), (snapshot) => {
        const remote = snapshot.docs.map((item) => item.data() as MatchEvent)
        onEvents(remote.length ? remote : seedEvents)
      }, onError),
    ] : []),
  ]
  return () => unsubscribes.forEach((unsubscribe) => unsubscribe())
}

export const saveMatch = (match: Match) =>
  setDoc(doc(db, 'matches', match.id), match)

export const saveTeam = (team: Team) =>
  setDoc(doc(db, 'teams', team.id), team)

export const saveMatchEvent = (event: MatchEvent) =>
  setDoc(doc(db, 'matchEvents', event.id), event)

export const removeMatchEvent = (eventId: string) =>
  deleteDoc(doc(db, 'matchEvents', eventId))

export const savePlayer = (player: Player) =>
  setDoc(doc(db, 'players', player.id), player)

export const saveMatchRosterEntry = (entry: MatchRosterEntry) =>
  setDoc(doc(db, 'matchRosters', entry.id), entry)

export const removeMatchRosterEntry = (entryId: string) =>
  deleteDoc(doc(db, 'matchRosters', entryId))

// Replaces every published team and match with the versioned official fixture, and
// adds the official rosters. Players are upserted by a stable ID, so clubs keep any
// extra player registered from the panel. Match rosters and events are never touched.
export async function publishOfficialFixture() {
  const [publishedTeams, publishedMatches] = await Promise.all([
    getDocs(collection(db, 'teams')),
    getDocs(collection(db, 'matches')),
  ])

  const batch = writeBatch(db)
  publishedTeams.forEach((item) => batch.delete(item.ref))
  publishedMatches.forEach((item) => batch.delete(item.ref))
  seedTeams.forEach((team) => batch.set(doc(db, 'teams', team.id), team))
  seedMatches.forEach((match) => batch.set(doc(db, 'matches', match.id), match))
  seedPlayers.forEach((player) => batch.set(doc(db, 'players', player.id), player))
  await batch.commit()
}
