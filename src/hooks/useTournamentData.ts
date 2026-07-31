import { useEffect, useState } from 'react'
import { matches as staticMatches } from '../data/matches'
import { matchRosters as staticRosters } from '../data/matchRosters'
import { matchEvents as staticEvents } from '../data/matchEvents'
import { players as staticPlayers } from '../data/players'
import { teams as staticTeams } from '../data/teams'
import { subscribeToTournamentData } from '../data/firestore'
import type { Match, MatchEvent, MatchRosterEntry, Player, Team } from '../types/tournament'
import { applyAutomaticMatchStatuses } from '../utils/matchStatus'
import { resolvePlayoffParticipants } from '../utils/playoffs'

export function useTournamentData() {
  const [storedMatches, setStoredMatches] = useState<Match[]>(staticMatches)
  const [now, setNow] = useState(() => new Date())
  const [teams, setTeams] = useState<Team[]>(staticTeams)
  // Seeded from the versioned copy so the site renders the real tournament even when
  // Firestore cannot be reached. A snapshot replaces it as soon as one arrives.
  const [players, setPlayers] = useState<Player[]>(staticPlayers)
  const [rosters, setRosters] = useState<MatchRosterEntry[]>(staticRosters)
  const [events, setEvents] = useState<MatchEvent[]>(staticEvents)
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

  // Both derivations happen at read time, so a corrected result corrects the bracket
  // and the statuses instead of leaving a stale value in the database. `publishedMatches`
  // is what Firestore actually holds, and is what the panel must write back: saving a
  // derived participant would freeze it, and would be refused for an editor by
  // `onlyResultChanged`.
  const matches = resolvePlayoffParticipants(applyAutomaticMatchStatuses(storedMatches, now), teams)
  return { matches, publishedMatches: storedMatches, teams, players, rosters, events, usingLiveData }
}
