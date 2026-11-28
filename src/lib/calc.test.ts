import { describe, expect, it } from 'vitest'
import {
  costPerKm,
  filterExpenses,
  plannedTotals,
  sumAmounts,
  totalByCategory,
  totalByMonth,
  totalByType,
} from './calc'
import type { Expense, PlannedExpense } from '../types'

const exp = (p: Partial<Expense>): Expense => ({
  id: Math.random().toString(),
  description: 'x',
  carId: 'car',
  amount: 10,
  date: '2026-10-01',
  categoryId: 'combustivel',
  type: 'routine',
  createdAt: '2026-10-01T00:00:00Z',
  ...p,
})

describe('sumAmounts', () => {
  it('não acumula erro de ponto flutuante', () => {
    expect(sumAmounts([0.1, 0.2])).toBe(0.3)
  })
})

describe('filterExpenses', () => {
  const list = [
    exp({ categoryId: 'a', type: 'routine', date: '2026-01-10' }),
    exp({ categoryId: 'b', type: 'maintenance', date: '2026-02-10' }),
    exp({ categoryId: 'b', type: 'upgrade', date: '2026-03-10' }),
  ]
  it('filtra por categoria, tipo e período', () => {
    expect(filterExpenses(list, { categoryIds: ['b'], type: 'all' })).toHaveLength(2)
    expect(filterExpenses(list, { categoryIds: [], type: 'upgrade' })).toHaveLength(1)
    expect(filterExpenses(list, { categoryIds: [], type: 'all', from: '2026-02-01', to: '2026-02-28' })).toHaveLength(1)
  })
  it('sem filtros devolve tudo', () => {
    expect(filterExpenses(list, { categoryIds: [], type: 'all' })).toHaveLength(3)
  })
})

describe('agrupamentos', () => {
  it('totalByCategory ordena do maior para o menor', () => {
    const r = totalByCategory(
      [exp({ categoryId: 'a', amount: 5 }), exp({ categoryId: 'b', amount: 20 }), exp({ categoryId: 'a', amount: 10 })],
      [{ id: 'a', name: 'A' }, { id: 'b', name: 'B' }],
    )
    expect(r).toEqual([
      { id: 'b', name: 'B', total: 20 },
      { id: 'a', name: 'A', total: 15 },
    ])
  })
  it('totalByType soma cada tipo', () => {
    const r = totalByType([exp({ type: 'upgrade', amount: 100 }), exp({ type: 'routine', amount: 1 })])
    expect(r).toEqual({ maintenance: 0, upgrade: 100, routine: 1 })
  })
  it('totalByMonth inclui meses vazios e cruza o ano', () => {
    const r = totalByMonth([exp({ date: '2025-12-05', amount: 50 })], '2026-02', 3)
    expect(r).toEqual([
      { month: '2025-12', total: 50 },
      { month: '2026-01', total: 0 },
      { month: '2026-02', total: 0 },
    ])
  })
})

describe('costPerKm', () => {
  it('retorna null sem dois registros de km', () => {
    expect(costPerKm([exp({ odometer: 1000 })])).toBeNull()
  })
  it('divide os gastos desde o primeiro km pelos km rodados', () => {
    const r = costPerKm([
      exp({ date: '2026-01-01', odometer: 10000, amount: 100 }),
      exp({ date: '2026-06-01', odometer: 11000, amount: 400 }),
      exp({ date: '2025-12-01', amount: 9999 }), // anterior ao primeiro km: ignorado
    ])
    expect(r).toBe(0.5)
  })
})

describe('plannedTotals', () => {
  it('ignora realizados e usa o máximo da faixa', () => {
    const base: PlannedExpense = {
      id: '1', description: 'LED', estimatedAmount: 300, categoryId: 'x', carId: 'car', type: 'upgrade',
      priority: 'low', status: 'planned',
    }
    const r = plannedTotals([
      base,
      { ...base, id: '2', estimatedAmount: 100, estimatedMax: 150 },
      { ...base, id: '3', status: 'done' },
    ])
    expect(r).toEqual({ min: 400, max: 450, count: 2 })
  })
})
