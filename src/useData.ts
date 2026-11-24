import { useCallback, useEffect, useRef, useState } from 'react'
import { newId } from './lib/id'
import { importInto, type ImportResult } from './storage/backup'
import { cleanupOnError, thenCleanup } from './storage/cleanup'
import { deleteImage } from './storage/images'
import * as remote from './storage/remote'
import type { AppData, Expense, PlannedExpense } from './types'

export type ExpenseInput = Omit<Expense, 'id' | 'createdAt'>
export type PlannedInput = Omit<PlannedExpense, 'id' | 'status' | 'expenseId'>

const dropPhotos = (ids: string[] = []) => Promise.allSettled(ids.map(deleteImage))

const EMPTY: AppData = { categories: [], expenses: [], planned: [] }

/**
 * Estado do app espelhando o banco. As alterações aparecem na hora (otimista) e são enviadas
 * ao Supabase; se o envio falhar, mostra o erro e recarrega o estado real do servidor.
 */
export function useData() {
  const [data, setData] = useState<AppData>(EMPTY)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const dataRef = useRef(data)
  useEffect(() => {
    dataRef.current = data
  }, [data])

  const refresh = useCallback(async () => {
    try {
      setData(await remote.fetchAll())
      setError('')
    } catch {
      setError('Não foi possível carregar os dados. Verifique a conexão e recarregue a página.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    let alive = true
    remote
      .fetchAll()
      .then((d) => alive && setData(d))
      .catch(() => alive && setError('Não foi possível carregar os dados. Verifique a conexão e recarregue a página.'))
      .finally(() => alive && setLoading(false))
    return () => {
      alive = false
    }
  }, [])

  const persist = useCallback(
    (op: Promise<unknown>) => {
      op.catch(() => {
        setError('Não foi possível salvar na nuvem. Os dados foram recarregados do servidor.')
        void refresh()
      })
    },
    [refresh],
  )

  const addExpense = useCallback(
    (input: ExpenseInput) => {
      const expense: Expense = { ...input, id: newId(), createdAt: new Date().toISOString() }
      setData((d) => ({ ...d, expenses: [...d.expenses, expense] }))
      persist(cleanupOnError(remote.insertExpenses([expense]), () => dropPhotos(expense.attachments)))
    },
    [persist],
  )

  const updateExpense = useCallback(
    (id: string, input: ExpenseInput) => {
      const prev = dataRef.current.expenses.find((e) => e.id === id)
      if (!prev) return
      const next: Expense = { ...prev, ...input }
      setData((d) => ({ ...d, expenses: d.expenses.map((e) => (e.id === id ? next : e)) }))
      // fotos tiradas do gasto só são apagadas depois de o banco confirmar a gravação
      const removed = (prev.attachments ?? []).filter((img) => !(next.attachments ?? []).includes(img))
      // fotos novas (enviadas antes de gravar) saem se o banco recusar; as tiradas só saem se ele aceitar
      const added = (next.attachments ?? []).filter((img) => !(prev.attachments ?? []).includes(img))
      persist(thenCleanup(cleanupOnError(remote.updateExpense(next), () => dropPhotos(added)), () => dropPhotos(removed)))
    },
    [persist],
  )

  const deleteExpense = useCallback(
    (id: string) => {
      const target = dataRef.current.expenses.find((e) => e.id === id)
      setData((d) => ({
        ...d,
        expenses: d.expenses.filter((e) => e.id !== id),
        planned: d.planned.map((p) => (p.expenseId === id ? { ...p, status: 'planned', expenseId: undefined } : p)),
      }))
      // as fotos só são apagadas depois de o banco confirmar que apagou o gasto
      const photos = target?.attachments ?? []
      persist(thenCleanup(remote.deleteExpense(id), () => dropPhotos(photos)))
    },
    [persist],
  )

  const addPlanned = useCallback(
    (input: PlannedInput) => {
      const item: PlannedExpense = { ...input, id: newId(), status: 'planned' }
      setData((d) => ({ ...d, planned: [...d.planned, item] }))
      persist(remote.insertPlanned([item]))
    },
    [persist],
  )

  const updatePlanned = useCallback(
    (id: string, input: PlannedInput) => {
      const prev = dataRef.current.planned.find((p) => p.id === id)
      if (!prev) return
      const next: PlannedExpense = { ...prev, ...input }
      setData((d) => ({ ...d, planned: d.planned.map((p) => (p.id === id ? next : p)) }))
      persist(remote.updatePlanned(next))
    },
    [persist],
  )

  const deletePlanned = useCallback(
    (id: string) => {
      setData((d) => ({ ...d, planned: d.planned.filter((p) => p.id !== id) }))
      persist(remote.deletePlanned(id))
    },
    [persist],
  )

  /** Cria o gasto real e marca o planejado como realizado. */
  const completePlanned = useCallback(
    (plannedId: string, input: ExpenseInput) => {
      const expense: Expense = { ...input, id: newId(), createdAt: new Date().toISOString() }
      setData((d) => ({
        ...d,
        expenses: [...d.expenses, expense],
        planned: d.planned.map((p) => (p.id === plannedId ? { ...p, status: 'done', expenseId: expense.id } : p)),
      }))
      persist(cleanupOnError(remote.completePlanned(plannedId, expense), () => dropPhotos(expense.attachments)))
    },
    [persist],
  )

  const addCategory = useCallback(
    (name: string) => {
      const category = { id: newId(), name }
      setData((d) => ({ ...d, categories: [...d.categories, category] }))
      persist(remote.insertCategories([category]))
    },
    [persist],
  )

  const renameCategory = useCallback(
    (id: string, name: string) => {
      setData((d) => ({ ...d, categories: d.categories.map((c) => (c.id === id ? { ...c, name } : c)) }))
      persist(remote.renameCategory(id, name))
    },
    [persist],
  )

  /** Gastos e planejados da categoria removida vão para "Outros". */
  const removeCategory = useCallback(
    (id: string) => {
      const fallback = dataRef.current.categories.find((c) => c.isFallback)
      if (!fallback || fallback.id === id) return
      const move = <T extends { categoryId: string }>(item: T): T =>
        item.categoryId === id ? { ...item, categoryId: fallback.id } : item
      setData((d) => ({
        categories: d.categories.filter((c) => c.id !== id),
        expenses: d.expenses.map(move),
        planned: d.planned.map(move),
      }))
      persist(remote.removeCategory(id))
    },
    [persist],
  )

  /** Adiciona dados (backup ou migração) à conta e recarrega. */
  const importData = useCallback(
    async (source: AppData, opts?: { withLegacyImages?: boolean }): Promise<ImportResult> => {
      const result = await importInto(source, opts)
      await refresh()
      return result
    },
    [refresh],
  )

  return {
    data,
    loading,
    error,
    clearError: () => setError(''),
    addExpense,
    updateExpense,
    deleteExpense,
    addPlanned,
    updatePlanned,
    deletePlanned,
    completePlanned,
    addCategory,
    renameCategory,
    removeCategory,
    importData,
  }
}

export type DataApi = ReturnType<typeof useData>
