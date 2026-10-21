import { newId } from '../lib/id'
import type { AppData, Category, Expense, PlannedExpense } from '../types'
import { saveImage } from './images'
import { getLegacyImage } from './legacy'
import * as remote from './remote'

export function isAppData(value: unknown): value is AppData {
  const v = value as AppData
  return !!v && Array.isArray(v.categories) && Array.isArray(v.expenses) && Array.isArray(v.planned)
}

export interface ImportResult {
  expenses: number
  planned: number
  photos: number
  /** fotos que o servidor recusou (acima de 3 MB ou fora do JPEG): não impedem a migração */
  photosSkipped: number
}

/**
 * Adiciona os dados de `source` à conta (nunca apaga nada). Categorias são casadas pelo nome;
 * as que não existem são criadas. Ids são regenerados. Fotos só vêm da migração local.
 */
export async function importInto(source: AppData, opts: { withLegacyImages?: boolean } = {}): Promise<ImportResult> {
  const current = await remote.fetchAll()
  const fallback = current.categories.find((c) => c.isFallback)
  if (!fallback) throw new Error('Categoria "Outros" não encontrada na conta.')

  const byName = new Map(current.categories.map((c) => [c.name.trim().toLowerCase(), c.id]))
  const categoryMap = new Map<string, string>() // id antigo -> id novo
  const toCreate: Category[] = []
  for (const c of source.categories) {
    const key = c.name.trim().toLowerCase()
    let id = byName.get(key)
    if (!id) {
      id = newId()
      toCreate.push({ id, name: c.name.trim() })
      byName.set(key, id)
    }
    categoryMap.set(c.id, id)
  }
  await remote.insertCategories(toCreate)
  const mapCategory = (old: string) => categoryMap.get(old) ?? fallback.id

  let photos = 0
  let photosSkipped = 0
  const expenseMap = new Map<string, string>()
  const expenses: Expense[] = []
  for (const e of source.expenses) {
    const id = newId()
    expenseMap.set(e.id, id)
    const attachments: string[] = []
    if (opts.withLegacyImages) {
      for (const oldId of e.attachments ?? []) {
        const blob = await getLegacyImage(oldId)
        if (!blob) continue
        const imgId = newId()
        try {
          await saveImage(imgId, blob)
        } catch {
          // o servidor recusa fotos fora do limite (3 MB, JPEG): pula só essa foto, em vez de abortar a migração inteira
          photosSkipped++
          continue
        }
        attachments.push(imgId)
        photos++
      }
    }
    expenses.push({ ...e, id, categoryId: mapCategory(e.categoryId), attachments: attachments.length ? attachments : undefined })
  }
  await remote.insertExpenses(expenses)

  const planned: PlannedExpense[] = source.planned.map((p) => ({
    ...p,
    id: newId(),
    categoryId: mapCategory(p.categoryId),
    expenseId: p.expenseId ? expenseMap.get(p.expenseId) : undefined,
    status: p.status === 'done' && p.expenseId && expenseMap.has(p.expenseId) ? 'done' : 'planned',
  }))
  await remote.insertPlanned(planned)

  return { expenses: expenses.length, planned: planned.length, photos, photosSkipped }
}
