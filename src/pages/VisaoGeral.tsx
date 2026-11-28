import { lazy, Suspense, useMemo, type ReactNode } from 'react'
import { CategoryBars, TypeStack } from '../components/Charts'
import { ErrorBoundary } from '../components/ErrorBoundary'
import { EmptyState } from '../components/ui'
import { categoryColorClass } from '../lib/categoryColor'
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

/** Os três totais pequenos dentro do cartão de destaque. */
function HeroStat({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-2xl border border-white/15 bg-white/[0.07] px-4 py-3 sm:block sm:p-4">
      <div className="min-w-0">
        <p className="text-xs text-blue-300">{label}</p>
        {hint && <p className="mt-0.5 text-[11px] text-blue-200 sm:hidden">{hint}</p>}
      </div>
      <p className="font-display text-lg whitespace-nowrap tabular-nums sm:mt-0.5 sm:text-xl">{value}</p>
      {hint && <p className="mt-0.5 hidden text-[11px] text-blue-200 sm:block">{hint}</p>}
    </div>
  )
}

function Panel({ title, aside, children }: { title: string; aside?: ReactNode; children: ReactNode }) {
  return (
    <section className="card">
      <div className="mb-4 flex items-baseline justify-between gap-3">
        <h2 className="font-semibold">{title}</h2>
        {aside}
      </div>
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

  const activeCarName = api.data.cars.find((c) => c.id === api.activeCarId)?.name ?? ''
  const categoryName = (id: string) => categories.find((c) => c.id === id)?.name ?? 'Sem categoria'
  const plannedHint =
    stats.planned.max > stats.planned.min ? `até ${formatCurrency(stats.planned.max)}` : `${stats.planned.count} ${stats.planned.count === 1 ? 'item' : 'itens'}`

  return (
    <div className="space-y-5">
      <h1 className="font-display text-3xl">Visão geral</h1>

      <section aria-label="Totais" className="sky-card grid gap-5 rounded-3xl p-5 text-white sm:p-8 lg:grid-cols-[1fr_auto] lg:items-center lg:gap-8">
        <div className="min-w-0">
          <p className="text-xs font-semibold tracking-[0.08em] text-blue-300">TOTAL GASTO</p>
          <p className="my-1 font-display text-[clamp(2rem,10vw,3.5rem)] leading-tight whitespace-nowrap tabular-nums">{formatCurrency(stats.total)}</p>
          <p className="text-sm text-blue-200">
            {activeCarName}
            {stats.perKm !== null && <> · custo de {formatCurrency(stats.perKm)} por km rodado</>}
          </p>
        </div>
        <div className="grid gap-3 sm:grid-cols-3 lg:w-[34rem]">
          <HeroStat label="Este mês" value={formatCurrency(stats.month)} />
          <HeroStat label="Este ano" value={formatCurrency(stats.year)} />
          <HeroStat label="Planejado" value={formatCurrency(stats.planned.min)} hint={plannedHint} />
        </div>
      </section>

      {expenses.length === 0 ? (
        <EmptyState>Registre seu primeiro gasto na aba “Gastos” para ver os gráficos aqui.</EmptyState>
      ) : (
        <>
          <div className="grid gap-5 lg:grid-cols-[1fr_21rem]">
            <Panel title="Gasto por mês" aside={<span className="muted text-xs">últimos 12 meses</span>}>
              <ErrorBoundary message="Não foi possível carregar o gráfico. Verifique a internet e tente de novo.">
                <Suspense fallback={<div className="h-56" />}><MonthlyBars items={stats.byMonth} /></Suspense>
              </ErrorBoundary>
            </Panel>
            <Panel title="Gasto por tipo"><TypeStack totals={stats.byType} /></Panel>
          </div>
          <div className="grid gap-5 lg:grid-cols-2">
            <Panel title="Gasto por categoria"><CategoryBars items={stats.byCategory} /></Panel>
            <Panel title="Últimos gastos">
              <ul className="-my-3 divide-y divide-rule">
                {stats.recent.map((e) => {
                  const category = categoryName(e.categoryId)
                  return (
                    <li key={e.id} className="flex items-center justify-between gap-3 py-3 text-sm">
                      <span className="min-w-0">
                        <span className={`${categoryColorClass(category)} flex flex-wrap items-center gap-x-1.5 text-xs text-ink-soft`}>
                          <span>{formatDate(e.date)}</span>
                          <span aria-hidden="true" className="h-1.5 w-1.5 shrink-0 rounded-full bg-(--cat-dot)" />
                          <span className="font-medium text-(--cat-ink)">{category}</span>
                        </span>
                        <span className="block truncate font-semibold">{e.description}</span>
                      </span>
                      <span className="shrink-0 font-semibold tabular-nums">{formatCurrency(e.amount)}</span>
                    </li>
                  )
                })}
              </ul>
            </Panel>
          </div>
        </>
      )}
    </div>
  )
}
