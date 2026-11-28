import type { BackupData } from '../types'
import {
  CAR_NAME_MAX,
  CATEGORY_NAME_MAX,
  DESCRIPTION_MAX,
  MAX_ATTACHMENTS,
  MAX_BACKUP_CARS,
  MAX_BACKUP_CATEGORIES,
  MAX_BACKUP_ROWS,
  NOTES_MAX,
} from './limits'

export type BackupCheck = { ok: true; data: BackupData } | { ok: false; error: string }

const TYPES = ['maintenance', 'upgrade', 'routine']
const PRIORITIES = ['low', 'medium', 'high']
const STATUSES = ['planned', 'done']
const MAX_ID = 100
const MAX_MONEY = 1e10 // numeric(12,2) no banco
const MAX_INT = 2_147_483_647 // integer no banco (quilometragem)

// o banco conta caracteres (code points), não unidades UTF-16: um emoji vale 1
const len = (s: string) => [...s].length
const isObj = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v)
const isId = (v: unknown) => typeof v === 'string' && v.length > 0 && v.length <= MAX_ID
const isMoney = (v: unknown) => typeof v === 'number' && Number.isFinite(v) && v > 0 && v < MAX_MONEY
const absent = (v: unknown) => v === undefined || v === null

function isIsoDate(v: unknown): boolean {
  if (typeof v !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(v)) return false
  const d = new Date(`${v}T00:00:00Z`)
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === v
}

function textProblem(v: unknown, label: string, max: number): string | null {
  if (typeof v !== 'string' || v.trim() === '') return `${label} vazia ou inválida`
  if (len(v) > max) return `${label} com mais de ${max} caracteres`
  return null
}

function notesProblem(v: unknown): string | null {
  if (absent(v)) return null
  if (typeof v !== 'string') return 'observações inválidas'
  return len(v) > NOTES_MAX ? `observações com mais de ${NOTES_MAX} caracteres` : null
}

function attachmentsProblem(v: unknown): string | null {
  if (absent(v)) return null
  if (!Array.isArray(v) || !v.every(isId)) return 'fotos inválidas'
  return v.length > MAX_ATTACHMENTS ? `mais de ${MAX_ATTACHMENTS} fotos` : null
}

function expenseProblem(e: unknown): string | null {
  if (!isObj(e)) return 'formato inválido'
  if (!isId(e.id)) return 'id inválido'
  const description = textProblem(e.description, 'descrição', DESCRIPTION_MAX)
  if (description) return description
  if (!isMoney(e.amount)) return 'valor inválido'
  if (!isIsoDate(e.date)) return 'data inválida'
  if (!isId(e.categoryId)) return 'categoria inválida'
  if (!absent(e.carId) && !isId(e.carId)) return 'carro inválido'
  if (!TYPES.includes(e.type as string)) return 'tipo inválido'
  if (!absent(e.odometer) && !(Number.isInteger(e.odometer) && (e.odometer as number) >= 0 && (e.odometer as number) <= MAX_INT)) {
    return 'quilometragem inválida'
  }
  if (!absent(e.createdAt) && (typeof e.createdAt !== 'string' || Number.isNaN(Date.parse(e.createdAt)))) return 'data de criação inválida'
  return notesProblem(e.notes) ?? attachmentsProblem(e.attachments)
}

function plannedProblem(p: unknown): string | null {
  if (!isObj(p)) return 'formato inválido'
  if (!isId(p.id)) return 'id inválido'
  const description = textProblem(p.description, 'descrição', DESCRIPTION_MAX)
  if (description) return description
  if (!isMoney(p.estimatedAmount)) return 'valor estimado inválido'
  if (!absent(p.estimatedMax) && !(isMoney(p.estimatedMax) && (p.estimatedMax as number) >= (p.estimatedAmount as number))) {
    return 'valor máximo inválido'
  }
  if (!isId(p.categoryId)) return 'categoria inválida'
  if (!absent(p.carId) && !isId(p.carId)) return 'carro inválido'
  if (!TYPES.includes(p.type as string)) return 'tipo inválido'
  if (!PRIORITIES.includes(p.priority as string)) return 'prioridade inválida'
  if (!STATUSES.includes(p.status as string)) return 'situação inválida'
  if (!absent(p.expenseId) && !isId(p.expenseId)) return 'gasto de origem inválido'
  return notesProblem(p.notes)
}

function categoryProblem(c: unknown): string | null {
  if (!isObj(c)) return 'formato inválido'
  if (!isId(c.id)) return 'id inválido'
  const name = textProblem(c.name, 'nome', CATEGORY_NAME_MAX)
  if (name) return name
  return absent(c.isFallback) || typeof c.isFallback === 'boolean' ? null : 'marca inválida'
}

function carProblem(c: unknown): string | null {
  if (!isObj(c)) return 'formato inválido'
  if (!isId(c.id)) return 'id inválido'
  const name = textProblem(c.name, 'nome', CAR_NAME_MAX)
  if (name) return name
  if (!absent(c.model) && (typeof c.model !== 'string' || len(c.model) > CAR_NAME_MAX)) return `modelo com mais de ${CAR_NAME_MAX} caracteres`
  if (!absent(c.year) && !(Number.isInteger(c.year) && (c.year as number) >= 1900 && (c.year as number) <= 2100)) return 'ano inválido'
  return null
}

function firstProblem(list: unknown[], label: string, check: (item: unknown) => string | null): string | null {
  for (let i = 0; i < list.length; i++) {
    const problem = check(list[i])
    if (problem) return `${label} ${i + 1}: ${problem}.`
  }
  return null
}

/** Confere o JSON de um backup antes de importar: formato, tipos e tamanhos. Devolve o primeiro problema, em pt-BR. */
export function validateBackup(value: unknown): BackupCheck {
  const fail = (error: string): BackupCheck => ({ ok: false, error })
  if (!isObj(value)) return fail('Esse arquivo não parece um backup do Carlog.')
  const { categories, expenses, planned } = value
  if (!Array.isArray(categories) || !Array.isArray(expenses) || !Array.isArray(planned)) {
    return fail('Esse arquivo não parece um backup do Carlog.')
  }
  // backups antigos não têm `cars`; se vier, tem de ser uma lista
  const cars = value.cars
  if (!absent(cars) && !Array.isArray(cars)) return fail('Esse arquivo não parece um backup do Carlog.')
  if (Array.isArray(cars) && cars.length > MAX_BACKUP_CARS) return fail(`Carros demais (máximo ${MAX_BACKUP_CARS}).`)
  if (categories.length > MAX_BACKUP_CATEGORIES) return fail(`Categorias demais (máximo ${MAX_BACKUP_CATEGORIES}).`)
  if (expenses.length > MAX_BACKUP_ROWS) return fail(`Gastos demais (máximo ${MAX_BACKUP_ROWS}).`)
  if (planned.length > MAX_BACKUP_ROWS) return fail(`Planejados demais (máximo ${MAX_BACKUP_ROWS}).`)
  const problem =
    firstProblem(Array.isArray(cars) ? cars : [], 'Carro', carProblem) ??
    firstProblem(categories, 'Categoria', categoryProblem) ??
    firstProblem(expenses, 'Gasto', expenseProblem) ??
    firstProblem(planned, 'Planejado', plannedProblem)
  return problem ? fail(problem) : { ok: true, data: value as unknown as BackupData }
}
