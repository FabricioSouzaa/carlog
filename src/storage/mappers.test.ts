import { describe, expect, it } from 'vitest'
import { carFromRow, carToRow, expenseFromRow, expenseToRow, plannedFromRow, plannedToRow } from './mappers'
import type { Expense, PlannedExpense } from '../types'

describe('mappers', () => {
  it('gasto: ida e volta preserva os campos', () => {
    const e: Expense = {
      id: 'a', description: 'Óleo', amount: 199.9, date: '2026-10-01', categoryId: 'c', carId: 'k', type: 'maintenance',
      odometer: 45000, notes: 'Filtro junto', attachments: ['f1'], createdAt: '2026-10-01T10:00:00Z',
    }
    expect(expenseFromRow({ ...expenseToRow(e), created_at: e.createdAt })).toEqual(e)
  })
  it('gasto: campos opcionais vazios viram null no banco e undefined no app', () => {
    const e: Expense = { id: 'a', description: 'x', amount: 1, date: '2026-10-01', categoryId: 'c', carId: 'k', type: 'routine', createdAt: 't' }
    const row = expenseToRow(e)
    expect(row.odometer).toBeNull()
    expect(row.attachments).toEqual([])
    const back = expenseFromRow(row)
    expect(back.odometer).toBeUndefined()
    expect(back.attachments).toBeUndefined()
  })
  it('planejado: numeric que chega como string vira número', () => {
    const p = plannedFromRow({
      id: 'p', description: 'LED', estimated_amount: '350.00' as unknown as number, estimated_max: '500' as unknown as number,
      category_id: 'c', car_id: 'k', type: 'upgrade', priority: 'high', notes: null, status: 'planned', expense_id: null,
    })
    expect(p.estimatedAmount).toBe(350)
    expect(p.estimatedMax).toBe(500)
    expect(p.carId).toBe('k')
  })
  it('planejado: ida e volta', () => {
    const p: PlannedExpense = {
      id: 'p', description: 'LED', estimatedAmount: 300, categoryId: 'c', carId: 'k', type: 'upgrade', priority: 'low',
      status: 'done', expenseId: 'e',
    }
    expect(plannedFromRow(plannedToRow(p))).toEqual(p)
  })
  it('gasto: o carro vai e volta pelo banco', () => {
    const e: Expense = { id: 'a', description: 'x', amount: 1, date: '2026-10-01', categoryId: 'c', carId: 'k', type: 'routine', createdAt: 't' }
    expect(expenseToRow(e).car_id).toBe('k')
    expect(expenseFromRow(expenseToRow(e)).carId).toBe('k')
  })
  it('carro: ida e volta, vazios viram null', () => {
    expect(carFromRow(carToRow({ id: 'k', name: 'Gol', model: '1.0', year: 2012 }))).toEqual({ id: 'k', name: 'Gol', model: '1.0', year: 2012 })
    const row = carToRow({ id: 'k', name: 'Gol' })
    expect(row.model).toBeNull()
    expect(carFromRow(row).year).toBeUndefined()
  })
})
