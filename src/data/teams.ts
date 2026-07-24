import type { Team } from '../types/tournament'

// Official Copa Fin del Mundo 2026 rosters: six men's teams and five women's teams.
// IDs stay stable across renames so published matches keep resolving.
export const teams: Team[] = [
  { id: 'men-cau-1', name: 'CAU Blanco', shortName: 'CAU Blanco', category: 'men', color: '#ef3340' },
  { id: 'men-cau-2', name: 'CAU Verde', shortName: 'CAU Verde', category: 'men', color: '#de6b18' },
  { id: 'men-cau-3', name: 'CAU Negro', shortName: 'CAU Negro', category: 'men', color: '#2364aa' },
  { id: 'men-los-nires', name: 'Ñires', shortName: 'Ñires', category: 'men', color: '#ba8b00' },
  { id: 'men-allpacas', name: 'All-Pakas', shortName: 'All-Pakas', category: 'men', color: '#2b8a66' },
  { id: 'men-ovejas-negras', name: 'Ovejas Negras', shortName: 'Ovejas Negras', category: 'men', color: '#38424d' },
  { id: 'women-cau-kipas', name: 'CAU Kipas', shortName: 'Kipas', category: 'women', color: '#ef3340' },
  { id: 'women-allpacas', name: 'All-Pakas Damas', shortName: 'All-Pakas', category: 'women', color: '#2b8a66' },
  { id: 'women-ovejas-negras', name: 'Ovejas Negras Damas', shortName: 'Ovejas Negras', category: 'women', color: '#38424d' },
  { id: 'women-acemhh', name: 'ACEMHH Damas', shortName: 'ACEMHH', category: 'women', color: '#6d3ba5' },
  { id: 'women-los-nires-zorras', name: 'Ñires Zorras', shortName: 'Zorras', category: 'women', color: '#ba8b00' },
]

export const getTeamsByCategory = (category: Team['category']) =>
  teams.filter((team) => team.category === category)
