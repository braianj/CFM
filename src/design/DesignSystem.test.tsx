import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { contrast } from './contrast'
import { DesignSystem } from './DesignSystem'

describe('contrast', () => {
  describe('when both colours are readable', () => {
    it('should measure the ratio', () => {
      expect(contrast('#ffffff', '#000000')).toBeCloseTo(21, 0)
      expect(contrast('#2b6b37', '#ffffff')).toBeCloseTo(6.44, 1)
    })
  })

  describe('when a token could not be read', () => {
    it('should return null instead of NaN', () => {
      expect(contrast('', '#ffffff')).toBeNull()
      expect(contrast('var(--accent)', '#ffffff')).toBeNull()
    })
  })
})

describe('DesignSystem', () => {
  it('should document the palette and the interaction roles', () => {
    render(<DesignSystem />)

    expect(screen.getByRole('heading', { name: 'Paleta' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Roles de interacción' })).toBeInTheDocument()
    expect(screen.getByText('--state-selected')).toBeInTheDocument()
  })

  it('should never render a broken measurement', () => {
    const { container } = render(<DesignSystem />)

    expect(container.textContent).not.toMatch(/NaN|Infinity/)
  })

  it('should let the selected state be tried out', () => {
    render(<DesignSystem />)

    fireEvent.click(screen.getByRole('button', { name: 'Femenino' }))

    expect(screen.getByRole('button', { name: 'Femenino' })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByRole('button', { name: 'Todos' })).toHaveAttribute('aria-pressed', 'false')
  })
})
