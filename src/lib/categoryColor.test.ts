import { describe, expect, it } from 'vitest'
import { CATEGORY_COLORS, categoryColorClass, categoryColorIndex } from './categoryColor'

describe('categoryColorIndex', () => {
  it('é estável e fica dentro da paleta', () => {
    for (const n of ['Combustível', 'Manutenção', 'Peças', 'Seguro', 'IPVA/Licenciamento', 'Outros', '']) {
      const i = categoryColorIndex(n)
      expect(i).toBeGreaterThanOrEqual(0)
      expect(i).toBeLessThan(CATEGORY_COLORS)
      expect(categoryColorIndex(n)).toBe(i)
    }
  })
  it('ignora maiúsculas, acentos e espaços nas pontas', () => {
    expect(categoryColorIndex('  COMBUSTIVEL ')).toBe(categoryColorIndex('Combustível'))
  })
  it('classe no formato cat-N', () => {
    expect(categoryColorClass('Peças')).toMatch(/^cat-[0-5]$/)
  })
})
