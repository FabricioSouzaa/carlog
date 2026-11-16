import { supabase } from '../supabase'
import type { AppData, Category, Expense, PlannedExpense } from '../types'
import {
  categoryFromRow,
  expenseFromRow,
  expenseToRow,
  plannedFromRow,
  plannedToRow,
  type CategoryRow,
  type ExpenseRow,
  type PlannedRow,
} from './mappers'

// Única camada que fala com o banco. user_id é preenchido pelo próprio banco (auth.uid()).

function check<T>(res: { data: T | null; error: { message: string } | null }): T {
  if (res.error) throw new Error(res.error.message)
  return res.data as T
}

export async function fetchAll(): Promise<AppData> {
  const [cats, exps, plans] = await Promise.all([
    supabase.from('categories').select('id,name,is_fallback').order('created_at'),
    supabase.from('expenses').select('*').order('created_at'),
    supabase.from('planned_expenses').select('*').order('created_at'),
  ])
  return {
    categories: check<CategoryRow[]>(cats).map(categoryFromRow),
    expenses: check<ExpenseRow[]>(exps).map(expenseFromRow),
    planned: check<PlannedRow[]>(plans).map(plannedFromRow),
  }
}

export async function insertExpenses(list: Expense[]): Promise<void> {
  if (list.length === 0) return
  check(await supabase.from('expenses').insert(list.map(expenseToRow)))
}

export async function updateExpense(e: Expense): Promise<void> {
  const { id, ...row } = expenseToRow(e)
  check(await supabase.from('expenses').update(row).eq('id', id))
}

export async function deleteExpense(id: string): Promise<void> {
  // função do banco (atômica): o planejado que originou o gasto volta a ficar pendente e o gasto é apagado
  check(await supabase.rpc('delete_expense', { p_id: id }))
}

export async function insertPlanned(list: PlannedExpense[]): Promise<void> {
  if (list.length === 0) return
  check(await supabase.from('planned_expenses').insert(list.map(plannedToRow)))
}

export async function updatePlanned(p: PlannedExpense): Promise<void> {
  const { id, ...row } = plannedToRow(p)
  check(await supabase.from('planned_expenses').update(row).eq('id', id))
}

export async function deletePlanned(id: string): Promise<void> {
  check(await supabase.from('planned_expenses').delete().eq('id', id))
}

export async function completePlanned(plannedId: string, e: Expense): Promise<void> {
  // função do banco (atômica): cria o gasto e liga ao planejado; se falhar, nada muda (e repetir não duplica)
  check(
    await supabase.rpc('complete_planned', {
      p_planned_id: plannedId,
      p_expense_id: e.id,
      p_description: e.description,
      p_amount: e.amount,
      p_date: e.date,
      p_category_id: e.categoryId,
      p_type: e.type,
      p_odometer: e.odometer ?? null,
      p_notes: e.notes ?? null,
      p_attachments: e.attachments ?? [],
      p_created_at: e.createdAt,
    }),
  )
}

export async function insertCategories(list: Category[]): Promise<void> {
  if (list.length === 0) return
  check(await supabase.from('categories').insert(list.map((c) => ({ id: c.id, name: c.name }))))
}

export async function renameCategory(id: string, name: string): Promise<void> {
  check(await supabase.from('categories').update({ name }).eq('id', id))
}

/** Move os lançamentos para a categoria "Outros" e remove a categoria (tudo numa função do banco, que acha o "Outros"). */
export async function removeCategory(id: string): Promise<void> {
  check(await supabase.rpc('remove_category', { p_id: id }))
}
