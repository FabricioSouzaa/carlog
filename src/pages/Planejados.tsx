import { useState } from 'react'
import { ExpenseForm } from '../components/ExpenseForm'
import { PlannedForm } from '../components/PlannedForm'
import { EmptyState, Fab, TypeBadge } from '../components/ui'
import { plannedTotals } from '../lib/calc'
import { formatCurrency } from '../lib/format'
import { safeHttpUrl } from '../lib/url'
import type { DataApi } from '../useData'
import { PRIORITY_LABEL, type PlannedExpense, type Priority } from '../types'

const PRIORITY_ORDER: Record<Priority, number> = { high: 0, medium: 1, low: 2 }
const PRIORITY_STYLE: Record<Priority, string> = {
  high: 'bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300',
  medium: 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300',
  low: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
}

const estimate = (p: PlannedExpense) =>
  p.estimatedMax ? `${formatCurrency(p.estimatedAmount)} – ${formatCurrency(p.estimatedMax)}` : formatCurrency(p.estimatedAmount)

function Notes({ text }: { text: string }) {
  const href = safeHttpUrl(text)
  return href ? (
    <a href={href} target="_blank" rel="noreferrer" className="mt-2 block truncate text-sm text-blue-600 underline dark:text-blue-400">{text}</a>
  ) : (
    <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">{text}</p>
  )
}

export function Planejados({ api }: { api: DataApi }) {
  const { data } = api
  const [editing, setEditing] = useState<PlannedExpense | 'new' | null>(null)
  const [completing, setCompleting] = useState<PlannedExpense | null>(null)

  const pending = data.planned
    .filter((p) => p.status === 'planned')
    .sort((a, b) => PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority])
  const done = data.planned.filter((p) => p.status === 'done')
  const totals = plannedTotals(data.planned)
  const categoryName = (id: string) => data.categories.find((c) => c.id === id)?.name ?? 'Sem categoria'

  function handleDelete(p: PlannedExpense) {
    if (window.confirm(`Excluir "${p.description}" dos planejados?`)) api.deletePlanned(p.id)
  }

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Planejados</h1>

      <div className="card">
        <p className="muted">Total estimado ({totals.count} {totals.count === 1 ? 'item' : 'itens'})</p>
        <p className="text-3xl font-bold tabular-nums">
          {formatCurrency(totals.min)}
          {totals.max > totals.min && <span className="text-xl font-semibold text-slate-500"> até {formatCurrency(totals.max)}</span>}
        </p>
      </div>

      {pending.length === 0 ? (
        <EmptyState>Nada planejado. Anote aqui o que você quer fazer no carro e quanto deve custar.</EmptyState>
      ) : (
        <div className="space-y-3">
          {pending.map((p) => (
            <article key={p.id} className="card">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <h3 className="font-semibold">{p.description}</h3>
                  <p className="muted">{categoryName(p.categoryId)}</p>
                </div>
                <p className="shrink-0 text-right font-bold tabular-nums">{estimate(p)}</p>
              </div>
              {p.notes && <Notes text={p.notes} />}
              <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <TypeBadge type={p.type} />
                  <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${PRIORITY_STYLE[p.priority]}`}>
                    Prioridade {PRIORITY_LABEL[p.priority].toLowerCase()}
                  </span>
                </div>
                <div className="flex flex-wrap gap-1">
                  <button type="button" className="btn-primary" onClick={() => setCompleting(p)}>Marcar como realizado</button>
                  <button type="button" className="btn-ghost" onClick={() => setEditing(p)}>Editar</button>
                  <button type="button" className="btn-danger" onClick={() => handleDelete(p)}>Excluir</button>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}

      {done.length > 0 && (
        <details className="card">
          <summary className="cursor-pointer font-medium">Realizados ({done.length})</summary>
          <ul className="mt-3 space-y-2">
            {done.map((p) => (
              <li key={p.id} className="flex items-center justify-between gap-3 text-sm">
                <span className="truncate text-slate-500 line-through dark:text-slate-400">{p.description}</span>
                <button type="button" className="btn-danger" onClick={() => handleDelete(p)}>Excluir</button>
              </li>
            ))}
          </ul>
        </details>
      )}

      <Fab onClick={() => setEditing('new')}>+ Planejar gasto</Fab>

      {editing && (
        <PlannedForm
          categories={data.categories}
          initial={editing === 'new' ? undefined : editing}
          onSubmit={(input) => (editing === 'new' ? api.addPlanned(input) : api.updatePlanned(editing.id, input))}
          onClose={() => setEditing(null)}
        />
      )}

      {completing && (
        <ExpenseForm
          title="Marcar como realizado"
          submitLabel="Registrar gasto"
          categories={data.categories}
          initial={{
            description: completing.description,
            amount: completing.estimatedAmount,
            categoryId: completing.categoryId,
            type: completing.type,
            notes: completing.notes,
          }}
          onSubmit={(input) => api.completePlanned(completing.id, input)}
          onClose={() => setCompleting(null)}
        />
      )}
    </div>
  )
}
