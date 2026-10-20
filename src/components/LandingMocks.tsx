import { formatCurrency, formatMonth, todayISO } from '../lib/format'
import { RevealItem } from './Reveal'

/*
 * Telas de exemplo da landing, desenhadas em código com dados fictícios (nada aqui vem da conta de ninguém).
 * Os `RevealItem` e as barras (`.bar-y`/`.bar-x`) só aparecem dentro de um `Reveal` (ver Reveal.tsx): use sempre dentro de um.
 */

const TODAY = todayISO()
const THIS_MONTH = TODAY.slice(0, 7)
const THIS_YEAR = TODAY.slice(0, 4)
const monthsAgo = (n: number) => {
  const [y, m] = THIS_MONTH.split('-').map(Number)
  const d = new Date(Date.UTC(y, m - 1 - n, 1))
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`
}
const longMonth = new Intl.DateTimeFormat('pt-BR', { month: 'long', year: 'numeric', timeZone: 'UTC' })

const STATS = [
  { label: 'Total gasto', value: formatCurrency(18742.3), hint: 'desde o primeiro gasto' },
  { label: 'Este mês', value: formatCurrency(1230), hint: longMonth.format(new Date(`${THIS_MONTH}-01T00:00:00Z`)) },
  { label: 'Este ano', value: formatCurrency(9860.45), hint: THIS_YEAR },
  { label: 'Custo por km', value: formatCurrency(0.38), hint: 'com a quilometragem' },
] as const

export function OverviewStats() {
  return (
    <div aria-hidden="true" className="grid grid-cols-2 gap-3 lg:grid-cols-4 lg:gap-4">
      {STATS.map((s, i) => (
        <RevealItem key={s.label} i={i} className="card !p-4">
          <div className="muted !text-[13px]">{s.label}</div>
          <div className="mt-0.5 text-xl font-bold tabular-nums lg:text-2xl">{s.value}</div>
          <div className="text-xs text-slate-400 dark:text-slate-500">{s.hint}</div>
        </RevealItem>
      ))}
    </div>
  )
}

const MONTHS = [28, 46, 37, 63, 50, 86, 69, 44, 60, 79, 53, 100]

export function MonthlyMock() {
  return (
    <div aria-hidden="true" className="card">
      <div className="mb-3 text-sm font-semibold">Gasto por mês (últimos 12 meses)</div>
      <div className="flex h-40 items-end gap-2">
        {MONTHS.map((h, i) => (
          <div key={i} className="bar-y flex-1 rounded-t" style={{ height: `${h}%`, background: 'var(--series-1)', '--i': i } as React.CSSProperties} />
        ))}
      </div>
      <div className="mt-2 flex justify-between text-[11px] text-slate-400 dark:text-slate-500">
        <span>{formatMonth(monthsAgo(11))}</span>
        <span>{formatMonth(THIS_MONTH)}</span>
      </div>
    </div>
  )
}

const CATEGORIES = [
  { name: 'Combustível', total: 7980, pct: 100 },
  { name: 'Manutenção', total: 5210.4, pct: 65 },
  { name: 'Seguro', total: 3150, pct: 40 },
  { name: 'Peças', total: 1640.9, pct: 20 },
]

export function CategoriesMock() {
  return (
    <div aria-hidden="true" className="card space-y-3">
      <div className="text-sm font-semibold">Gasto por categoria</div>
      {CATEGORIES.map((c, i) => (
        <RevealItem key={c.name} i={i}>
          <div className="mb-1 flex justify-between text-[13px]">
            <span>{c.name}</span>
            <span className="font-medium tabular-nums">{formatCurrency(c.total)}</span>
          </div>
          <div className="h-2.5 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
            <div className="bar-x h-full rounded-full" style={{ width: `${c.pct}%`, background: 'var(--series-1)', '--i': i } as React.CSSProperties} />
          </div>
        </RevealItem>
      ))}
    </div>
  )
}

const TYPES = [
  { name: 'Manutenção', pct: 46, color: 'var(--series-1)' },
  { name: 'Valorização', pct: 18, color: 'var(--series-2)' },
  { name: 'Rotina', pct: 36, color: 'var(--series-3)' },
]

export function TypesMock() {
  return (
    <div aria-hidden="true" className="card space-y-3">
      <div className="text-sm font-semibold">Gasto por tipo</div>
      <div className="flex h-3.5 gap-0.5 overflow-hidden rounded-full">
        {TYPES.map((t) => (
          <div key={t.name} style={{ flex: `${t.pct} 1 0`, background: t.color }} />
        ))}
      </div>
      <ul className="space-y-1.5 text-[13px]">
        {TYPES.map((t, i) => (
          <li key={t.name}>
            <RevealItem i={i} className="flex items-center justify-between">
              <span className="flex items-center gap-2">
                <span className="inline-block h-3 w-3 rounded-sm" style={{ background: t.color }} />
                {t.name}
              </span>
              <span className="font-medium tabular-nums">{t.pct}%</span>
            </RevealItem>
          </li>
        ))}
      </ul>
    </div>
  )
}
