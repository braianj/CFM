// Rewrites the versioned copy of the tournament from what is published in Firestore.
//
// The public site does not subscribe to the squads, the call-ups or the events: they are
// about a thousand documents and Firestore bills one read per document on every visit.
// They ship inside the build instead. That copy has to be refreshed by hand whenever
// scoresheets are loaded, which is what this does.
//
//   node scripts/regenerate-seed.mjs
//
// It only reads, and it reads each collection once. Reading is what the daily free quota
// limits, so do not run it in a loop.
import { writeFileSync, readFileSync } from 'node:fs'

const PROJECT = 'cfm-hockey'
const BASE = `https://firestore.googleapis.com/v1/projects/${PROJECT}/databases/(default)/documents`

const plain = (fields) => Object.fromEntries(Object.entries(fields).map(([key, value]) => {
  if ('integerValue' in value) return [key, Number(value.integerValue)]
  if ('booleanValue' in value) return [key, value.booleanValue]
  if ('nullValue' in value) return [key, null]
  return [key, value.stringValue]
}))

async function fetchAll(collection) {
  const out = []
  let pageToken
  do {
    const query = new URLSearchParams({ pageSize: '300', ...(pageToken ? { pageToken } : {}) })
    const response = await fetch(`${BASE}/${collection}?${query}`)
    if (!response.ok) {
      const { error } = await response.json().catch(() => ({ error: {} }))
      throw new Error(`${collection}: ${response.status} ${error?.message ?? ''}`.trim())
    }
    const page = await response.json()
    out.push(...(page.documents ?? []).map((document) => plain(document.fields)))
    pageToken = page.nextPageToken
  } while (pageToken)
  return out
}

const literal = (value) => (typeof value === 'string' ? `'${value.replace(/'/g, "\\'")}'` : String(value))

const line = (record, keys) =>
  `  { ${keys.filter((key) => record[key] !== undefined && record[key] !== null)
    .map((key) => `${key}: ${literal(record[key])}`).join(', ')} },`

// Keeps whatever the file says above the export, so its comment survives.
const rewrite = (path, exportLine, body) => {
  const header = readFileSync(path, 'utf8').split(exportLine)[0]
  writeFileSync(path, `${header}${exportLine}\n${body}\n]\n`)
}

const MATCH_KEYS = ['id', 'category', 'startDateTime', 'stage', 'homeTeamId', 'awayTeamId',
  'homeLabel', 'awayLabel', 'homeScore', 'awayScore', 'status', 'countsForStandings',
  'resolution', 'venue', 'notes']
const ROSTER_KEYS = ['id', 'matchId', 'category', 'teamId', 'playerId', 'playerName',
  'jerseyNumber', 'saves', 'goalsAgainst', 'minutesPlayed']
const EVENT_KEYS = ['id', 'matchId', 'category', 'teamId', 'type', 'playerId', 'playerName',
  'jerseyNumber', 'assistId', 'assistName', 'assistJerseyNumber', 'secondAssistId',
  'secondAssistName', 'secondAssistJerseyNumber', 'period', 'gameTime', 'penaltyMinutes',
  'reason', 'notes']

const [matches, rosters, events] = await Promise.all([
  fetchAll('matches'), fetchAll('matchRosters'), fetchAll('matchEvents'),
])

matches.sort((a, b) => a.startDateTime.localeCompare(b.startDateTime) || a.id.localeCompare(b.id))
rosters.sort((a, b) => a.matchId.localeCompare(b.matchId) || a.teamId.localeCompare(b.teamId) || a.jerseyNumber - b.jerseyNumber)
events.sort((a, b) => a.matchId.localeCompare(b.matchId) || a.id.localeCompare(b.id))

// A score of zero is a result, so the two score keys are always written, null included.
// Every other absent key is simply left out.
const matchLine = (match) => `  { ${MATCH_KEYS
  .filter((key) => key === 'homeScore' || key === 'awayScore' || (match[key] !== undefined && match[key] !== null))
  .map((key) => `${key}: ${match[key] === undefined || match[key] === null ? 'null' : literal(match[key])}`)
  .join(', ')} },`

rewrite('src/data/matches.ts', 'export const matches: Match[] = [', matches.map(matchLine).join('\n'))
// The helper below the array is part of the module, so it goes back after the rewrite.
writeFileSync('src/data/matches.ts', `${readFileSync('src/data/matches.ts', 'utf8')}
export const getMatchesByCategory = (category: Match['category']) =>
  matches.filter((match) => match.category === category)
`)

rewrite('src/data/matchRosters.ts', 'export const matchRosters: MatchRosterEntry[] = [',
  rosters.map((entry) => line(entry, ROSTER_KEYS)).join('\n'))

rewrite('src/data/matchEvents.ts', 'export const matchEvents: MatchEvent[] = [',
  events.map((event) => line({ ...event, playerName: event.playerName ?? '' }, EVENT_KEYS)).join('\n'))

console.log(`matches ${matches.length} · rosters ${rosters.length} · events ${events.length}`)
console.log('Revisá el diff y desplegá: el sitio público lee de acá, no de Firestore.')
