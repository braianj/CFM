import type { Match, Player } from '../types/tournament'

// True once the published schedule holds exactly the matches of the versioned fixture.
export function isOfficialFixturePublished(published: Match[], official: Match[]) {
  const publishedIds = new Set(published.map((match) => match.id))
  return publishedIds.size === official.length && official.every((match) => publishedIds.has(match.id))
}

// Rosters are additive: clubs may register more players later, so extra entries are fine.
export function areOfficialRostersPublished(published: Player[], official: Player[]) {
  const publishedIds = new Set(published.map((player) => player.id))
  return official.every((player) => publishedIds.has(player.id))
}
