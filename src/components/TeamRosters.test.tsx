import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import type { Player, Team } from '../types/tournament'
import { TeamRosters } from './TeamRosters'

const team: Team = { id: 'men-cau-1', name: 'CAU Blanco', shortName: 'CAU Blanco', category: 'men' }

const player = (id: string, name: string, role?: Player['role']): Player => ({
  id,
  category: 'men',
  teamId: 'men-cau-1',
  name,
  ...(role && { role }),
  active: true,
})

describe('TeamRosters', () => {
  describe('when a club has not submitted its roster', () => {
    it('should say the squad is still pending', () => {
      render(<TeamRosters teams={[team]} players={[]} showCategory={false} onSelect={() => {}} />)

      expect(screen.getByText('El plantel todavía no fue publicado.')).toBeInTheDocument()
    })
  })

  describe('when the scope has no team at all', () => {
    it('should show an empty state', () => {
      render(<TeamRosters teams={[]} players={[]} showCategory={false} onSelect={() => {}} />)

      expect(screen.getByText('No hay equipos para esta selección.')).toBeInTheDocument()
    })
  })

  describe('when a player left the squad', () => {
    it('should list only the active players', () => {
      const squad = [player('a', 'Activa'), { ...player('b', 'Inactiva'), active: false }]

      render(<TeamRosters teams={[team]} players={squad} showCategory={false} onSelect={() => {}} />)

      expect(screen.getByText('Activa')).toBeInTheDocument()
      expect(screen.queryByText('Inactiva')).toBeNull()
      expect(screen.getByText('1')).toBeInTheDocument()
    })
  })

  describe('when a player declared a role', () => {
    it('should show the role next to the name', () => {
      render(<TeamRosters teams={[team]} players={[player('a', 'Arquero', 'GK')]} showCategory={false} onSelect={() => {}} />)

      expect(screen.getByTitle('Arquero/a')).toHaveTextContent('GK')
    })
  })
})
