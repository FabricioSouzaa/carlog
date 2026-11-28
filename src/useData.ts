import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { diffAttachments } from './lib/attachments'
import { deleteCarBlocker, forCar, resolveActiveCarId } from './lib/cars'
import { newId } from './lib/id'
import { importInto, type ImportResult } from './storage/backup'
import { cleanupOnError, thenCleanup } from './storage/cleanup'
import { deleteImage } from './storage/images'
import * as remote from './storage/remote'
import type { AppData, BackupData, Car, Expense, PlannedExpense } from './types'

// `carId` é opcional na entrada: sem ele, o lançamento vai para o carro ativo
export type ExpenseInput = Omit<Expense, 'id' | 'createdAt' | 'carId'> & { carId?: string }
export type PlannedInput = Omit<PlannedExpense, 'id' | 'status' | 'expenseId' | 'carId'> & { carId?: string }
export type CarInput = Omit<Car, 'id'>

const NO_CAR = 'Os dados ainda estão carregando. Tente de novo em instantes.'
const ACTIVE_CAR_KEY = 'carlog:active-car'
// só uma conveniência deste aparelho: se o armazenamento falhar, vale o carro mais antigo
const readActiveCar = (): string | null => {
  try {
    return localStorage.getItem(ACTIVE_CAR_KEY)
  } catch {
    return null
  }
}

const dropPhotos = (ids: string[] = []) => Promise.allSettled(ids.map((id) => deleteImage(id)))

const EMPTY: AppData = { cars: [], categories: [], expenses: [], planned: [] }

/**
 * Estado do app espelhando o banco. As alterações aparecem na hora (otimista) e são enviadas
 * ao Supabase; se o envio falhar, mostra o erro e recarrega o estado real do servidor.
 */
export function useData() {
  const [data, setData] = useState<AppData>(EMPTY)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [storedCar, setStoredCar] = useState(readActiveCar)
  const activeCarId = resolveActiveCarId(data.cars, storedCar)

  const dataRef = useRef(data)
  useEffect(() => {
    dataRef.current = data
  }, [data])

  // as telas veem só o carro ativo (categorias e lista de carros são da conta toda); `allData` é para o backup
  const view = useMemo<AppData>(
    () => ({ ...data, expenses: forCar(data.expenses, activeCarId), planned: forCar(data.planned, activeCarId) }),
    [data, activeCarId],
  )

  // gravações de carro em andamento: um gasto num carro recém-criado espera o carro chegar ao banco (a chave estrangeira recusaria antes)
  const carWrites = useRef<Promise<unknown>>(Promise.resolve())
  const afterCars = useCallback(<T,>(run: () => Promise<T>): Promise<T> => carWrites.current.then(run), [])

  const activeCarRef = useRef(activeCarId)
  useEffect(() => {
    activeCarRef.current = activeCarId
  }, [activeCarId])

  const setActiveCar = useCallback((id: string) => {
    setStoredCar(id)
    try {
      localStorage.setItem(ACTIVE_CAR_KEY, id)
    } catch {
      // sem armazenamento (janela privada etc.): vale só até recarregar
    }
  }, [])

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
      const carId = input.carId ?? activeCarRef.current
      if (!carId) return setError(NO_CAR)
      const expense: Expense = { ...input, carId, id: newId(), createdAt: new Date().toISOString() }
      setData((d) => ({ ...d, expenses: [...d.expenses, expense] }))
      persist(cleanupOnError(afterCars(() => remote.insertExpenses([expense])), () => dropPhotos(expense.attachments)))
    },
    [persist, afterCars],
  )

  const updateExpense = useCallback(
    (id: string, input: ExpenseInput) => {
      const prev = dataRef.current.expenses.find((e) => e.id === id)
      if (!prev) return
      const next: Expense = { ...prev, ...input, carId: input.carId ?? prev.carId }
      setData((d) => ({ ...d, expenses: d.expenses.map((e) => (e.id === id ? next : e)) }))
      // fotos tiradas do gasto só são apagadas depois de o banco confirmar a gravação
      const { added, removed } = diffAttachments(prev.attachments, next.attachments)
      // fotos novas (enviadas antes de gravar) saem se o banco recusar; as tiradas só saem se ele aceitar
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
      const carId = input.carId ?? activeCarRef.current
      if (!carId) return setError(NO_CAR)
      const item: PlannedExpense = { ...input, carId, id: newId(), status: 'planned' }
      setData((d) => ({ ...d, planned: [...d.planned, item] }))
      persist(afterCars(() => remote.insertPlanned([item])))
    },
    [persist, afterCars],
  )

  const updatePlanned = useCallback(
    (id: string, input: PlannedInput) => {
      const prev = dataRef.current.planned.find((p) => p.id === id)
      if (!prev) return
      const next: PlannedExpense = { ...prev, ...input, carId: input.carId ?? prev.carId }
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
      // o banco copia o carro do planejado para o gasto (o cliente não escolhe): o estado local faz o mesmo
      const planned = dataRef.current.planned.find((p) => p.id === plannedId)
      if (!planned) return setError('Esse planejado não existe mais. Recarregue a página.')
      const expense: Expense = { ...input, carId: planned.carId, id: newId(), createdAt: new Date().toISOString() }
      setData((d) => ({
        ...d,
        expenses: [...d.expenses, expense],
        planned: d.planned.map((p) => (p.id === plannedId ? { ...p, status: 'done', expenseId: expense.id } : p)),
      }))
      persist(cleanupOnError(remote.completePlanned(plannedId, expense), () => dropPhotos(expense.attachments)))
    },
    [persist],
  )

  const addCar = useCallback(
    (input: CarInput) => {
      const car: Car = { ...input, id: newId() }
      setData((d) => ({ ...d, cars: [...d.cars, car] }))
      const write = remote.insertCars([car])
      carWrites.current = write.catch(() => {})
      persist(write)
    },
    [persist],
  )

  const updateCar = useCallback(
    (id: string, input: CarInput) => {
      setData((d) => ({ ...d, cars: d.cars.map((c) => (c.id === id ? { ...c, ...input } : c)) }))
      persist(remote.updateCar({ ...input, id }))
    },
    [persist],
  )

  /** Só apaga carro vazio e que não seja o último; devolve o motivo quando recusa (o banco confere de novo). */
  const deleteCar = useCallback(
    (id: string): string | null => {
      const { cars, expenses, planned } = dataRef.current
      const blocker = deleteCarBlocker(cars, id, { expenses, planned })
      if (blocker) return blocker
      setData((d) => ({ ...d, cars: d.cars.filter((c) => c.id !== id) }))
      persist(remote.deleteCar(id))
      return null
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
        ...d,
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
    async (source: BackupData, opts?: { withLegacyImages?: boolean }): Promise<ImportResult> => {
      // quem vem sem carro (backup antigo) cai no carro ativo
      const result = await importInto(source, { ...opts, carId: activeCarRef.current })
      await refresh()
      return result
    },
    [refresh],
  )

  return {
    data: view,
    allData: data,
    loading,
    error,
    clearError: () => setError(''),
    activeCarId,
    setActiveCar,
    addCar,
    updateCar,
    deleteCar,
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
