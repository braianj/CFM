import {
  collection,
  deleteDoc,
  doc,
  getDocs,
  onSnapshot,
  setDoc,
  writeBatch,
  type Unsubscribe,
} from 'firebase/firestore'
import { matches as seedMatches } from './matches'
import { players as seedPlayers } from './players'
import { teams as seedTeams } from './teams'
import { db } from '../firebase'
import type { Match, MatchEvent, MatchRosterEntry, Player, Team } from '../types/tournament'

export const subscribeToTournamentData = (
  onMatches: (matches: Match[]) => void,
  onTeams: (teams: Team[]) => void,
  onPlayers: (players: Player[]) => void,
  onRosters: (rosters: MatchRosterEntry[]) => void,
  onEvents: (events: MatchEvent[]) => void,
  onError: () => void,
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
    onSnapshot(collection(db, 'players'), (snapshot) => {
      onPlayers(snapshot.docs.map((item) => item.data() as Player))
    }, onError),
    onSnapshot(collection(db, 'matchRosters'), (snapshot) => {
      onRosters(snapshot.docs.map((item) => item.data() as MatchRosterEntry))
    }, onError),
    onSnapshot(collection(db, 'matchEvents'), (snapshot) => {
      onEvents(snapshot.docs.map((item) => item.data() as MatchEvent))
    }, onError),
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

export const removePlayer = (playerId: string) =>
  deleteDoc(doc(db, 'players', playerId))

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
