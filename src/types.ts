export type ExpenseType = 'maintenance' | 'upgrade' | 'routine'
export type Priority = 'low' | 'medium' | 'high'

export interface Car {
  id: string
  name: string
  model?: string
  year?: number
}

export interface Category {
  id: string
  name: string
  isFallback?: boolean // "Outros": não pode ser removida
}

export interface Expense {
  id: string
  description: string
  amount: number // em reais, 2 casas decimais
  date: string // ISO yyyy-mm-dd
  categoryId: string
  carId: string
  type: ExpenseType
  odometer?: number // km
  notes?: string
  attachments?: string[] // ids das fotos (nota fiscal etc.)
  createdAt: string
}

export interface PlannedExpense {
  id: string
  description: string
  estimatedAmount: number
  estimatedMax?: number // se for faixa de preço
  categoryId: string
  carId: string
  type: ExpenseType
  priority: Priority
  notes?: string
  status: 'planned' | 'done'
  expenseId?: string // preenchido ao virar gasto real
}

export interface AppData {
  cars: Car[] // do mais antigo para o mais novo; sempre há pelo menos um
  categories: Category[]
  expenses: Expense[]
  planned: PlannedExpense[]
}

/**
 * Formato aceito na importação (backup JSON ou migração do navegador): backups antigos não têm carros
 * nem `carId`. Quem não traz carro cai no carro escolhido na importação.
 */
export interface BackupData {
  cars?: Car[]
  categories: Category[]
  expenses: (Omit<Expense, 'carId'> & { carId?: string })[]
  planned: (Omit<PlannedExpense, 'carId'> & { carId?: string })[]
}

export const EXPENSE_TYPE_LABEL: Record<ExpenseType, string> = {
  maintenance: 'Manutenção',
  upgrade: 'Valorização',
  routine: 'Rotina',
}

export const EXPENSE_TYPE_HINT: Record<ExpenseType, string> = {
  maintenance: 'Mantém o carro funcionando',
  upgrade: 'Agrega valor ou conforto',
  routine: 'Custo de uso do dia a dia',
}

export const PRIORITY_LABEL: Record<Priority, string> = {
  low: 'Baixa',
  medium: 'Média',
  high: 'Alta',
}
