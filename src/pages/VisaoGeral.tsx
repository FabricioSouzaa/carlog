import { lazy, Suspense, useMemo, type ReactNode } from 'react'
import { CategoryBars, TypeStack } from '../components/Charts'
import { ErrorBoundary } from '../components/ErrorBoundary'
import { EmptyState } from '../components/ui'
import {
  costPerKm,
  plannedTotals,
  sortByDateDesc,
  totalAmount,
  totalByCategory,
  totalByMonth,
  totalByType,
  totalForMonth,
  totalForYear,
} from '../lib/calc'
import { formatCurrency, formatDate, todayISO } from '../lib/format'
import type { DataApi } from '../useData'

// o Recharts é pesado: só é baixado quando a Visão geral tem gráfico para mostrar
const MonthlyBars = lazy(() => import('../components/MonthlyBars'))

function Stat({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="card">
      <p className="muted">{label}</p>
      <p className="text-xl font-bold tabular-nums sm:text-2xl">{value}</p>
      {hint && <p className="muted">{hint}</p>}
    </div>
  )
}

function Panel({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="card">
      <h2 className="mb-3 font-semibold">{title}</h2>
      {children}
    </section>
  )
}

export function VisaoGeral({ api }: { api: DataApi }) {
  const { expenses, categories, planned } = api.data
  const today = todayISO()

  const stats = useMemo(
    () => ({
      total: totalAmount(expenses),
      month: totalForMonth(expenses, today.slice(0, 7)),
      year: totalForYear(expenses, today.slice(0, 4)),
      byCategory: totalByCategory(expenses, categories),
      byType: totalByType(expenses),
      byMonth: totalByMonth(expenses, today.slice(0, 7), 12),
      recent: sortByDateDesc(expenses).slice(0, 5),
      perKm: costPerKm(expenses),
      planned: plannedTotals(planned),
    }),
    [expenses, categories, planned, today],
  )

  const categoryName = (id: string) => categories.find((c) => c.id === id)?.name ?? 'Sem categoria'
  const plannedHint =
    stats.planned.max > stats.planned.min ? `até ${formatCurrency(stats.planned.max)}` : `${stats.planned.count} ${stats.planned.count === 1 ? 'item' : 'itens'}`

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Visão geral</h1>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Total gasto" value={formatCurrency(stats.total)} />
        <Stat label="Este mês" value={formatCurrency(stats.month)} />
        <Stat label="Este ano" value={formatCurrency(stats.year)} />
        <Stat label="Planejado" value={formatCurrency(stats.planned.min)} hint={plannedHint} />
      </div>
      {stats.perKm !== null && (
        <p className="muted">Custo por km rodado (entre o menor e o maior km registrados): <strong>{formatCurrency(stats.perKm)}/km</strong></p>
      )}

      {expenses.length === 0 ? (
        <EmptyState>Registre seu primeiro gasto na aba “Gastos” para ver os gráficos aqui.</EmptyState>
      ) : (
        <>
          <Panel title="Gasto por mês (últimos 12 meses)">
            <ErrorBoundary message="Não foi possível carregar o gráfico. Verifique a internet e tente de novo.">
              <Suspense fallback={<div className="h-56" />}><MonthlyBars items={stats.byMonth} /></Suspense>
            </ErrorBoundary>
          </Panel>
          <div className="grid gap-4 md:grid-cols-2">
            <Panel title="Gasto por categoria"><CategoryBars items={stats.byCategory} /></Panel>
            <Panel title="Gasto por tipo"><TypeStack totals={stats.byType} /></Panel>
          </div>
          <Panel title="Últimos gastos">
            <ul className="divide-y divide-slate-100 dark:divide-slate-800">
              {stats.recent.map((e) => (
                <li key={e.id} className="flex items-center justify-between gap-3 py-2 text-sm">
                  <span className="min-w-0">
                    <span className="block truncate font-medium">{e.description}</span>
                    <span className="muted">{formatDate(e.date)} · {categoryName(e.categoryId)}</span>
                  </span>
                  <span className="shrink-0 font-medium tabular-nums">{formatCurrency(e.amount)}</span>
                </li>
              ))}
            </ul>
          </Panel>
        </>
      )}
    </div>
  )
}
