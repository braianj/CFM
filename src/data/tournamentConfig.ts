import type { Category, TournamentConfig } from '../types/tournament'

// Both tournaments run on the same rink, so every date and time is read in Ushuaia.
export const TIMEZONE = 'America/Argentina/Ushuaia'

export const tournamentConfigs: Record<Category, TournamentConfig> = {
  men: {
    category: 'men',
    name: 'Torneo Masculino',
    shortName: 'Masculino',
    timezone: TIMEZONE,
    scoring: { win: 3, overtimeWin: 2, overtimeLoss: 1, shootoutWin: 2, shootoutLoss: 1, loss: 0, draw: 1 },
    qualification: [
      { from: 1, to: 1, label: 'Final A', tone: 'primary' },
      { from: 2, to: 3, label: 'Repechaje A', tone: 'primary' },
      { from: 4, to: 4, label: 'Final B', tone: 'secondary' },
      { from: 5, to: 6, label: 'Repechaje B', tone: 'secondary' },
    ],
  },
  women: {
    category: 'women',
    name: 'Torneo Femenino',
    shortName: 'Femenino',
    timezone: TIMEZONE,
    scoring: { win: 3, overtimeWin: 2, overtimeLoss: 1, shootoutWin: 2, shootoutLoss: 1, loss: 0, draw: 1 },
    qualification: [
      { from: 1, to: 1, label: 'Semifinal 1', tone: 'primary' },
      { from: 2, to: 3, label: 'Semifinal 2', tone: 'primary' },
      { from: 4, to: 5, label: 'Repechaje', tone: 'secondary' },
    ],
  },
}

export const stageLabels = {
  regular: 'Fase regular',
  repechaje: 'Repechaje',
  'repechaje-a': 'Repechaje A',
  'repechaje-b': 'Repechaje B',
  'semifinal-1': 'Semifinal 1',
  'semifinal-2': 'Semifinal 2',
  'third-place': 'Tercer puesto',
  final: 'Final',
  'final-a': 'Final A',
  'final-b': 'Final B',
} as const

export const statusLabels = {
  upcoming: 'Próximo',
  live: 'En vivo',
  finished: 'Finalizado',
  postponed: 'Postergado',
  tbd: 'A confirmar',
} as const
