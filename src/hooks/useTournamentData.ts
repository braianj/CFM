import { useEffect, useState } from 'react'
import { matches as staticMatches } from '../data/matches'
import { teams as staticTeams } from '../data/teams'
import { subscribeToTournamentData } from '../data/firestore'
import type { Match, MatchEvent, Player, Team } from '../types/tournament'

export function useTournamentData() {
  const [matches, setMatches] = useState<Match[]>(staticMatches)
  const [teams, setTeams] = useState<Team[]>(staticTeams)
  const [players, setPlayers] = useState<Player[]>([])
  const [events, setEvents] = useState<MatchEvent[]>([])
  const [usingLiveData, setUsingLiveData] = useState(false)

  useEffect(() => subscribeToTournamentData(
    (nextMatches) => {
      setMatches(nextMatches)
      setUsingLiveData(nextMatches !== staticMatches)
    },
    setTeams,
    setPlayers,
    setEvents,
    () => setUsingLiveData(false),
  ), [])

  return { matches, teams, players, events, usingLiveData }
}
