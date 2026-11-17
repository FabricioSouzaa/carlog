import { describe, expect, it } from 'vitest'
import { validateBackup } from './backup'
import { DESCRIPTION_MAX, MAX_ATTACHMENTS, NOTES_MAX } from './limits'

const expense = (over: Record<string, unknown> = {}) => ({
  id: 'e1', description: 'Troca de óleo', amount: 250.5, date: '2026-03-10', categoryId: 'c1', type: 'maintenance', createdAt: '2026-03-10T12:00:00Z', ...over,
})
const planned = (over: Record<string, unknown> = {}) => ({
  id: 'p1', description: 'LED', estimatedAmount: 400, categoryId: 'c1', type: 'upgrade', priority: 'high', status: 'planned', ...over,
})
const backup = (over: Record<string, unknown> = {}) => ({
  categories: [{ id: 'c1', name: 'Manutenção' }, { id: 'c2', name: 'Outros', isFallback: true }],
  expenses: [expense()],
  planned: [planned()],
  ...over,
})
const error = (v: unknown) => {
  const r = validateBackup(v)
  return r.ok ? null : r.error
}

describe('validateBackup', () => {
  it('aceita um backup válido (e só devolve os dados)', () => {
    const r = validateBackup(backup())
    expect(r.ok).toBe(true)
  })
  it('aceita campos opcionais ausentes ou nulos', () => {
    expect(validateBackup(backup({ expenses: [expense({ odometer: null, notes: null, attachments: undefined })] })).ok).toBe(true)
  })
  it('recusa o que não é backup', () => {
    for (const v of [null, 'x', 42, [], {}, { categories: [], expenses: [] }]) expect(error(v)).toMatch(/não parece um backup/)
  })
  it('recusa quantidade absurda', () => {
    expect(error(backup({ expenses: Array.from({ length: 10_001 }, () => expense()) }))).toMatch(/Gastos demais/)
  })
  it('aponta o gasto com problema pelo número', () => {
    expect(error(backup({ expenses: [expense(), expense({ amount: -5 })] }))).toBe('Gasto 2: valor inválido.')
    expect(error(backup({ expenses: [expense({ amount: '10' })] }))).toBe('Gasto 1: valor inválido.')
    expect(error(backup({ expenses: [expense({ amount: 1e10 })] }))).toMatch(/valor inválido/)
  })
  it('confere data real, tipo e quilometragem', () => {
    expect(error(backup({ expenses: [expense({ date: '2026-02-30' })] }))).toMatch(/data inválida/)
    expect(error(backup({ expenses: [expense({ date: '10/03/2026' })] }))).toMatch(/data inválida/)
    expect(error(backup({ expenses: [expense({ type: 'outro' })] }))).toMatch(/tipo inválido/)
    expect(error(backup({ expenses: [expense({ odometer: 12.5 })] }))).toMatch(/quilometragem inválida/)
    expect(error(backup({ expenses: [expense({ odometer: -1 })] }))).toMatch(/quilometragem inválida/)
  })
  it('limita descrição, observações e fotos', () => {
    expect(error(backup({ expenses: [expense({ description: 'a'.repeat(DESCRIPTION_MAX + 1) })] }))).toMatch(/descrição com mais de 200/)
    expect(error(backup({ expenses: [expense({ description: '   ' })] }))).toMatch(/descrição vazia/)
    expect(error(backup({ expenses: [expense({ notes: 'a'.repeat(NOTES_MAX + 1) })] }))).toMatch(/observações com mais de 2000/)
    expect(error(backup({ expenses: [expense({ attachments: Array.from({ length: MAX_ATTACHMENTS + 1 }, (_, i) => `f${i}`) })] }))).toMatch(/mais de 5 fotos/)
    expect(error(backup({ expenses: [expense({ attachments: [1] })] }))).toMatch(/fotos inválidas/)
  })
  it('valida os planejados', () => {
    expect(error(backup({ planned: [planned({ priority: 'urgente' })] }))).toBe('Planejado 1: prioridade inválida.')
    expect(error(backup({ planned: [planned({ estimatedMax: 100 })] }))).toBe('Planejado 1: valor máximo inválido.')
    expect(error(backup({ planned: [planned({ status: 'feito' })] }))).toBe('Planejado 1: situação inválida.')
    expect(validateBackup(backup({ planned: [planned({ estimatedMax: 500 })] })).ok).toBe(true)
  })
  it('valida as categorias', () => {
    expect(error(backup({ categories: [{ id: 'c1', name: '' }] }))).toMatch(/Categoria 1: nome vazia/)
    expect(error(backup({ categories: [{ id: 'c1', name: 'x', isFallback: 'sim' }] }))).toMatch(/marca inválida/)
  })
})
