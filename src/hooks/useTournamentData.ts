import { useEffect, useState } from 'react'
import { matches as staticMatches } from '../data/matches'
import { subscribeToTournamentData } from '../data/firestore'
import type { Match, MatchEvent } from '../types/tournament'

export function useTournamentData() {
  const [matches, setMatches] = useState<Match[]>(staticMatches)
  const [events, setEvents] = useState<MatchEvent[]>([])
  const [usingLiveData, setUsingLiveData] = useState(false)

  useEffect(() => subscribeToTournamentData(
    (nextMatches) => {
      setMatches(nextMatches)
      setUsingLiveData(nextMatches !== staticMatches)
    },
    setEvents,
    () => setUsingLiveData(false),
  ), [])

  return { matches, events, usingLiveData }
}
