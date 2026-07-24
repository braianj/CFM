import type { Player } from '../types/tournament'

// The versioned squads are the baseline and Firestore holds the live state on top of
// them. Merging by ID keeps a team's players on screen while the published documents
// are still streaming in, instead of blanking the squad until the last one arrives.
//
// This is why the panel deactivates a player instead of deleting the document: a
// deleted document would simply fall back to the versioned entry and reappear.
export function mergeRosters(official: Player[], published: Player[]): Player[] {
  const byId = new Map(official.map((player) => [player.id, player]))
  published.forEach((player) => byId.set(player.id, player))
  return [...byId.values()]
}
