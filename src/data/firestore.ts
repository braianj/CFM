import {
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  setDoc,
  writeBatch,
  type Unsubscribe,
} from 'firebase/firestore'
import { matches as seedMatches } from './matches'
import { teams as seedTeams } from './teams'
import { db } from '../firebase'
import type { Match, MatchEvent, Player, Team } from '../types/tournament'

export const subscribeToTournamentData = (
  onMatches: (matches: Match[]) => void,
  onTeams: (teams: Team[]) => void,
  onPlayers: (players: Player[]) => void,
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

export async function seedFirestore() {
  const batch = writeBatch(db)
  seedTeams.forEach((team) => batch.set(doc(db, 'teams', team.id), team))
  seedMatches.forEach((match) => batch.set(doc(db, 'matches', match.id), match))
  await batch.commit()
}

export const staticTeams: Team[] = seedTeams
