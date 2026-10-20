import type { ReactNode } from 'react'
import { formatCurrency, formatDate, formatMonth, todayISO } from '../lib/format'
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

const SHADOW = 'shadow-[0_8px_24px_rgba(0,0,0,0.08)]'

function Mock({ className = '', children }: { className?: string; children: ReactNode }) {
  return (
    <div aria-hidden="true" className={`rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900 ${SHADOW} ${className}`}>
      {children}
    </div>
  )
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="mb-1 text-sm font-medium text-slate-600 dark:text-slate-300">{label}</div>
      <div className="rounded-lg border border-slate-300 bg-white px-3 py-2 dark:border-slate-700 dark:bg-slate-900">{value}</div>
    </div>
  )
}

function Chip({ children, active = false }: { children: ReactNode; active?: boolean }) {
  return (
    <span className={`rounded-full px-3 py-1.5 text-[13px] font-medium ${active ? 'bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300' : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300'}`}>
      {children}
    </span>
  )
}

export function ExpenseFormMock() {
  return (
    <Mock className="space-y-3 text-base">
      <RevealItem i={0}><div className="font-semibold">Novo gasto</div></RevealItem>
      <RevealItem i={1}><Field label="Descrição" value="Troca de óleo e filtro" /></RevealItem>
      <RevealItem i={2}>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Valor" value={formatCurrency(389.9)} />
          <Field label="Data" value={formatDate(TODAY)} />
        </div>
      </RevealItem>
      <RevealItem i={3}><Field label="Categoria" value="Manutenção" /></RevealItem>
      <RevealItem i={4}>
        <div className="mb-1.5 text-sm font-medium text-slate-600 dark:text-slate-300">Tipo</div>
        <div className="flex flex-wrap gap-2">
          <Chip active>Manutenção</Chip>
          <Chip>Valorização</Chip>
          <Chip>Rotina</Chip>
        </div>
      </RevealItem>
      <RevealItem i={5}><Field label="Quilometragem (opcional)" value="48.200 km" /></RevealItem>
      <RevealItem i={6}>
        <div className="rounded-lg border border-dashed border-slate-300 px-3 py-3 text-center text-sm text-slate-500 dark:border-slate-700 dark:text-slate-400">
          📷 Adicionar fotos da nota (até 5)
        </div>
      </RevealItem>
      <RevealItem i={7}><div className="rounded-lg bg-blue-600 py-2 text-center text-sm font-medium text-white">Salvar gasto</div></RevealItem>
    </Mock>
  )
}

export function PlannedMock() {
  return (
    <Mock className="space-y-2.5">
      <RevealItem i={0}>
        <div className="flex items-center justify-between gap-3">
          <span className="font-semibold">Trocar farol para LED</span>
          <span className="shrink-0 rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-semibold text-red-700 dark:bg-red-950 dark:text-red-300">Prioridade alta</span>
        </div>
      </RevealItem>
      <RevealItem i={1}><div className="text-sm text-slate-500 dark:text-slate-400">Estimado: {formatCurrency(400)} · Peças · Valorização</div></RevealItem>
      <RevealItem i={2}><div className="rounded-lg bg-blue-600 py-2 text-center text-sm font-medium text-white">Marcar como realizado</div></RevealItem>
    </Mock>
  )
}

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
