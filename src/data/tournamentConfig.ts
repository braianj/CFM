import type { Category, TournamentConfig } from '../types/tournament'

export const tournamentConfigs: Record<Category, TournamentConfig> = {
  men: {
    category: 'men',
    name: 'Torneo Masculino',
    shortName: 'Masculino',
    timezone: 'America/Argentina/Ushuaia',
    scoring: { win: 3, draw: 1, loss: 0 },
    qualification: [
      { from: 1, to: 1, label: 'Final A', tone: 'primary' },
      { from: 2, to: 3, label: 'Semifinal A', tone: 'primary' },
      { from: 4, to: 4, label: 'Final B', tone: 'secondary' },
      { from: 5, to: 6, label: 'Semifinal B', tone: 'secondary' },
    ],
  },
  women: {
    category: 'women',
    name: 'Torneo Femenino',
    shortName: 'Femenino',
    timezone: 'America/Argentina/Ushuaia',
    scoring: { win: 3, draw: 1, loss: 0 },
    qualification: [{ from: 1, to: 2, label: 'Final', tone: 'primary' }],
  },
}

export const stageLabels = {
  regular: 'Fase regular',
  'semifinal-a': 'Semifinal A',
  'semifinal-b': 'Semifinal B',
  'final-a': 'Final A',
  'final-b': 'Final B',
  final: 'Final',
} as const

export const statusLabels = {
  upcoming: 'Próximo',
  live: 'En vivo',
  finished: 'Finalizado',
  postponed: 'Postergado',
  tbd: 'A confirmar',
} as const
