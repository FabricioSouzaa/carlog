import type { Car, Category, Expense, PlannedExpense } from '../types'

// Conversão entre as linhas do banco (snake_case) e os tipos do app.

export interface CarRow { id: string; name: string; model: string | null; year: number | null }
export interface CategoryRow { id: string; name: string; is_fallback: boolean }
export interface ExpenseRow {
  id: string; description: string; amount: number; date: string; category_id: string; car_id: string
  type: Expense['type']; odometer: number | null; notes: string | null
  attachments: string[] | null; created_at: string
}
export interface PlannedRow {
  id: string; description: string; estimated_amount: number; estimated_max: number | null
  category_id: string; car_id: string; type: PlannedExpense['type']; priority: PlannedExpense['priority']
  notes: string | null; status: PlannedExpense['status']; expense_id: string | null
}

export const carFromRow = (r: CarRow): Car => ({ id: r.id, name: r.name, model: r.model ?? undefined, year: r.year ?? undefined })
export const carToRow = (c: Car) => ({ id: c.id, name: c.name, model: c.model ?? null, year: c.year ?? null })

export const categoryFromRow = (r: CategoryRow): Category => ({ id: r.id, name: r.name, isFallback: r.is_fallback || undefined })

export const expenseFromRow = (r: ExpenseRow): Expense => ({
  id: r.id,
  description: r.description,
  amount: Number(r.amount),
  date: r.date,
  categoryId: r.category_id,
  carId: r.car_id,
  type: r.type,
  odometer: r.odometer ?? undefined,
  notes: r.notes ?? undefined,
  attachments: r.attachments && r.attachments.length > 0 ? r.attachments : undefined,
  createdAt: r.created_at,
})

export const expenseToRow = (e: Expense) => ({
  id: e.id,
  description: e.description,
  amount: e.amount,
  date: e.date,
  category_id: e.categoryId,
  car_id: e.carId,
  type: e.type,
  odometer: e.odometer ?? null,
  notes: e.notes ?? null,
  attachments: e.attachments ?? [],
  created_at: e.createdAt,
})

export const plannedFromRow = (r: PlannedRow): PlannedExpense => ({
  id: r.id,
  description: r.description,
  estimatedAmount: Number(r.estimated_amount),
  estimatedMax: r.estimated_max != null ? Number(r.estimated_max) : undefined,
  categoryId: r.category_id,
  carId: r.car_id,
  type: r.type,
  priority: r.priority,
  notes: r.notes ?? undefined,
  status: r.status,
  expenseId: r.expense_id ?? undefined,
})

export const plannedToRow = (p: PlannedExpense) => ({
  id: p.id,
  description: p.description,
  estimated_amount: p.estimatedAmount,
  estimated_max: p.estimatedMax ?? null,
  category_id: p.categoryId,
  car_id: p.carId,
  type: p.type,
  priority: p.priority,
  notes: p.notes ?? null,
  status: p.status,
  expense_id: p.expenseId ?? null,
})
