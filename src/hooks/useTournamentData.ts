import { useEffect, useState } from 'react'
import { matches as staticMatches } from '../data/matches'
import { teams as staticTeams } from '../data/teams'
import { subscribeToTournamentData } from '../data/firestore'
import type { Match, MatchEvent, MatchRosterEntry, Player, Team } from '../types/tournament'
import { applyAutomaticMatchStatuses } from '../utils/matchStatus'

export function useTournamentData() {
  const [storedMatches, setStoredMatches] = useState<Match[]>(staticMatches)
  const [now, setNow] = useState(() => new Date())
  const [teams, setTeams] = useState<Team[]>(staticTeams)
  const [players, setPlayers] = useState<Player[]>([])
  const [rosters, setRosters] = useState<MatchRosterEntry[]>([])
  const [events, setEvents] = useState<MatchEvent[]>([])
  const [usingLiveData, setUsingLiveData] = useState(false)

  useEffect(() => subscribeToTournamentData(
    (nextMatches) => {
      setStoredMatches(nextMatches)
      setUsingLiveData(nextMatches !== staticMatches)
    },
    setTeams,
    setPlayers,
    setRosters,
    setEvents,
    () => setUsingLiveData(false),
  ), [])

  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 30_000)
    return () => window.clearInterval(timer)
  }, [])

  const matches = applyAutomaticMatchStatuses(storedMatches, now)
  return { matches, teams, players, rosters, events, usingLiveData }
}
