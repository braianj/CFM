import type { Team } from '../types/tournament'

// Edit this file to add, remove, rename, or recolor teams.
export const teams: Team[] = [
  { id: 'men-cau-1', name: 'CAU Blanco', shortName: 'CAU Blanco', category: 'men', color: '#ef3340' },
  { id: 'men-cau-2', name: 'CAU Verde', shortName: 'CAU Verde', category: 'men', color: '#de6b18' },
  { id: 'men-cau-3', name: 'CAU Negro', shortName: 'CAU Negro', category: 'men', color: '#2364aa' },
  { id: 'men-acemhh', name: 'ACEMHH', shortName: 'ACEMHH', category: 'men', color: '#6d3ba5' },
  { id: 'men-allpacas', name: 'Alpacas', shortName: 'Alpacas', category: 'men', color: '#2b8a66' },
  { id: 'men-los-nires', name: 'LOS ÑIRES', shortName: 'ÑIRES', category: 'men', color: '#ba8b00' },
  { id: 'women-cau-kipas', name: 'CAU Kipas', shortName: 'KIPAS', category: 'women', color: '#ef3340' },
  { id: 'women-acemhh', name: 'ACEMHH', shortName: 'ACEMHH', category: 'women', color: '#6d3ba5' },
  { id: 'women-allpacas', name: 'ALLPACAS', shortName: 'ALLPACAS', category: 'women', color: '#2b8a66' },
  {
    id: 'women-los-nires-zorras',
    name: 'LOS ÑIRES – Las Zorras',
    shortName: 'LAS ZORRAS',
    category: 'women',
    color: '#ba8b00',
  },
]

export const getTeamsByCategory = (category: Team['category']) =>
  teams.filter((team) => team.category === category)
