import { useMemo, useState } from 'react'
import { ExpenseCard } from '../components/ExpenseCard'
import { ExpenseForm } from '../components/ExpenseForm'
import { EmptyState, Fab } from '../components/ui'
import { filterExpenses, sortByDateDesc, totalAmount, type ExpenseFilters } from '../lib/calc'
import { formatCurrency } from '../lib/format'
import type { DataApi } from '../useData'
import { EXPENSE_TYPE_LABEL, type Expense, type ExpenseType } from '../types'

const NO_FILTERS: ExpenseFilters = { categoryIds: [], type: 'all' }

export function Gastos({ api }: { api: DataApi }) {
  const { data } = api
  const [filters, setFilters] = useState<ExpenseFilters>(NO_FILTERS)
  const [editing, setEditing] = useState<Expense | 'new' | null>(null)

  const filtered = useMemo(() => sortByDateDesc(filterExpenses(data.expenses, filters)), [data.expenses, filters])
  const total = useMemo(() => totalAmount(filtered), [filtered])
  const hasFilters = filters.categoryIds.length > 0 || filters.type !== 'all' || !!filters.from || !!filters.to
  const categoryById = new Map(data.categories.map((c) => [c.id, c]))

  const toggleCategory = (id: string) =>
    setFilters((f) => ({
      ...f,
      categoryIds: f.categoryIds.includes(id) ? f.categoryIds.filter((c) => c !== id) : [...f.categoryIds, id],
    }))

  function handleDelete(e: Expense) {
    if (window.confirm(`Excluir "${e.description}"? Essa ação não pode ser desfeita.`)) api.deleteExpense(e.id)
  }

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Gastos</h1>

      <div className="card">
        <p className="muted">{hasFilters ? 'Total com os filtros aplicados' : 'Total gasto'}</p>
        <p className="text-3xl font-bold tabular-nums">{formatCurrency(total)}</p>
        <p className="muted">
          {filtered.length} {filtered.length === 1 ? 'lançamento' : 'lançamentos'}
        </p>
      </div>

      <section className="card space-y-3" aria-label="Filtros">
        <div>
          <span className="label">Categorias</span>
          <div className="flex flex-wrap gap-2">
            {data.categories.map((c) => {
              const on = filters.categoryIds.includes(c.id)
              return (
                <button
                  key={c.id}
                  type="button"
                  aria-pressed={on}
                  onClick={() => toggleCategory(c.id)}
                  className={`rounded-full border px-3 py-1 text-sm ${
                    on
                      ? 'border-blue-600 bg-blue-600 text-white'
                      : 'border-line-strong text-ink-soft'
                  }`}
                >
                  {c.name}
                </button>
              )
            })}
          </div>
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div>
            <label className="label" htmlFor="f-type">Tipo</label>
            <select
              id="f-type"
              className="input"
              value={filters.type}
              onChange={(e) => setFilters((f) => ({ ...f, type: e.target.value as ExpenseType | 'all' }))}
            >
              <option value="all">Todos</option>
              {(Object.keys(EXPENSE_TYPE_LABEL) as ExpenseType[]).map((t) => (
                <option key={t} value={t}>{EXPENSE_TYPE_LABEL[t]}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="label" htmlFor="f-from">De</label>
            <input id="f-from" type="date" className="input" value={filters.from ?? ''} onChange={(e) => setFilters((f) => ({ ...f, from: e.target.value || undefined }))} />
          </div>
          <div>
            <label className="label" htmlFor="f-to">Até</label>
            <input id="f-to" type="date" className="input" value={filters.to ?? ''} onChange={(e) => setFilters((f) => ({ ...f, to: e.target.value || undefined }))} />
          </div>
        </div>
        {hasFilters && (
          <button type="button" className="btn-outline" onClick={() => setFilters(NO_FILTERS)}>Limpar filtros</button>
        )}
      </section>

      {data.expenses.length === 0 ? (
        <EmptyState>Nenhum gasto ainda. Toque em “+ Novo gasto” para começar.</EmptyState>
      ) : filtered.length === 0 ? (
        <EmptyState>Nenhum gasto encontrado com esses filtros.</EmptyState>
      ) : (
        <div className="space-y-3">
          {filtered.map((e) => (
            <ExpenseCard key={e.id} expense={e} category={categoryById.get(e.categoryId)} onEdit={() => setEditing(e)} onDelete={() => handleDelete(e)} />
          ))}
        </div>
      )}

      <Fab onClick={() => setEditing('new')}>+ Novo gasto</Fab>

      {editing && (
        <ExpenseForm
          title={editing === 'new' ? 'Novo gasto' : 'Editar gasto'}
          categories={data.categories}
          initial={editing === 'new' ? undefined : editing}
          onSubmit={(input) => (editing === 'new' ? api.addExpense(input) : api.updateExpense(editing.id, input))}
          onClose={() => setEditing(null)}
        />
      )}
    </div>
  )
}
