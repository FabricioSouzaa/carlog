import type { CategoryTotal } from '../lib/calc'
import { formatCurrency } from '../lib/format'
import { EXPENSE_TYPE_LABEL, type ExpenseType } from '../types'

/** Magnitude por categoria: barras horizontais de uma só cor, ordenadas, valor direto no rótulo. */
export function CategoryBars({ items }: { items: CategoryTotal[] }) {
  const max = Math.max(...items.map((i) => i.total), 1)
  return (
    <ul className="space-y-3">
      {items.map((i) => (
        <li key={i.id}>
          <div className="mb-1 flex justify-between gap-3 text-sm">
            <span className="truncate">{i.name}</span>
            <span className="shrink-0 font-medium tabular-nums">{formatCurrency(i.total)}</span>
          </div>
          <div className="h-2.5 rounded-full bg-slate-100 dark:bg-slate-800" role="presentation">
            <div className="h-full rounded-full" style={{ width: `${(i.total / max) * 100}%`, background: 'var(--series-1)' }} />
          </div>
        </li>
      ))}
    </ul>
  )
}

const TYPE_COLOR: Record<ExpenseType, string> = {
  maintenance: 'var(--series-1)',
  upgrade: 'var(--series-2)',
  routine: 'var(--series-3)',
}

/** Parte-do-todo por tipo: uma barra empilhada com legenda que carrega valor e percentual. */
export function TypeStack({ totals }: { totals: Record<ExpenseType, number> }) {
  const types = Object.keys(EXPENSE_TYPE_LABEL) as ExpenseType[]
  const sum = types.reduce((acc, t) => acc + totals[t], 0)
  return (
    <div>
      <div className="flex h-4 gap-0.5 overflow-hidden rounded-full" role="img" aria-label="Proporção de gastos por tipo">
        {types.filter((t) => totals[t] > 0).map((t) => (
          <div key={t} style={{ width: `${(totals[t] / sum) * 100}%`, background: TYPE_COLOR[t] }} title={`${EXPENSE_TYPE_LABEL[t]}: ${formatCurrency(totals[t])}`} />
        ))}
      </div>
      <ul className="mt-4 space-y-2">
        {types.map((t) => (
          <li key={t} className="flex items-center justify-between gap-3 text-sm">
            <span className="flex items-center gap-2">
              <span className="inline-block h-3 w-3 rounded-sm" style={{ background: TYPE_COLOR[t] }} />
              {EXPENSE_TYPE_LABEL[t]}
            </span>
            <span className="tabular-nums">
              <span className="font-medium">{formatCurrency(totals[t])}</span>
              <span className="muted"> · {sum > 0 ? Math.round((totals[t] / sum) * 100) : 0}%</span>
            </span>
          </li>
        ))}
      </ul>
    </div>
  )
}
