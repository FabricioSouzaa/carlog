import type { ReactNode } from 'react'
import { formatCurrency, formatDate, formatKm, todayISO } from '../lib/format'
import type { ScreenKey } from './AppScreens'
import { TypeBadge } from './ui'

/*
 * As telas do app no celular (barra de cima e menu de baixo, como no app de verdade), com dados fictícios.
 * O quadro é fixo, 280x596 px, e o `FeaturePhone` o coloca dentro da moldura do aparelho.
 */

const daysAgo = (n: number) => {
  const [y, m, d] = todayISO().split('-').map(Number)
  const date = new Date(Date.UTC(y, m - 1, d - n))
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}-${String(date.getUTCDate()).padStart(2, '0')}`
}

const TABS = [
  { id: 'visao', label: 'Visão geral', icon: '📊' },
  { id: 'gastos', label: 'Gastos', icon: '🧾' },
  { id: 'planejados', label: 'Planejados', icon: '🗓️' },
  { id: 'ajustes', label: 'Ajustes', icon: '⚙️' },
] as const

/** Barra de status, topo do app, conteúdo e menu de baixo. */
function PhoneApp({ active, children }: { active: ScreenKey; children: ReactNode }) {
  return (
    <div className="flex h-[596px] w-[280px] flex-col bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-100">
      <div className="flex h-9 shrink-0 items-end justify-between bg-white px-5 pb-1 text-[11px] font-semibold dark:bg-slate-900">
        <span>9:41</span>
        <span aria-hidden="true">5G ▮ 100%</span>
      </div>
      <div className="shrink-0 border-b border-slate-200 bg-white px-4 py-2 text-sm font-bold dark:border-slate-800 dark:bg-slate-900">🚗 Carlog</div>
      <div className="min-h-0 flex-1 space-y-3 overflow-hidden p-3">{children}</div>
      <div className="grid h-14 shrink-0 grid-cols-4 border-t border-slate-200 bg-white/95 dark:border-slate-800 dark:bg-slate-900">
        {TABS.map((t) => (
          <span key={t.id} className={`flex flex-col items-center justify-center gap-0.5 text-[9px] font-medium tracking-tight whitespace-nowrap ${t.id === active ? 'text-blue-600 dark:text-blue-400' : 'text-slate-500 dark:text-slate-400'}`}>
            <span aria-hidden="true" className="text-base">{t.icon}</span>
            {t.label}
          </span>
        ))}
      </div>
    </div>
  )
}

const MONTHS = [28, 46, 37, 63, 50, 86, 69, 44, 60, 79, 53, 100]

function Overview() {
  return (
    <PhoneApp active="visao">
      <div className="grid grid-cols-2 gap-2">
        <div className="card !p-3">
          <p className="muted !text-[11px]">Total gasto</p>
          <p className="text-base font-bold tabular-nums">{formatCurrency(18742.3)}</p>
        </div>
        <div className="card !p-3">
          <p className="muted !text-[11px]">Este mês</p>
          <p className="text-base font-bold tabular-nums">{formatCurrency(1230)}</p>
        </div>
      </div>
      <section className="card !p-3">
        <h2 className="mb-2 text-[13px] font-semibold">Gasto por mês</h2>
        <div className="flex h-28 items-end gap-1.5">
          {MONTHS.map((h, i) => (
            <div key={i} className="flex-1 rounded-t" style={{ height: `${h}%`, background: 'var(--series-1)' }} />
          ))}
        </div>
      </section>
      <section className="card !p-3">
        <h2 className="mb-2 text-[13px] font-semibold">Gasto por categoria</h2>
        {[
          ['Combustível', 100],
          ['Manutenção', 65],
          ['Seguro', 40],
        ].map(([n, w]) => (
          <div key={n} className="mb-1.5 flex items-center gap-2 text-[11px]">
            <span className="w-16 shrink-0">{n}</span>
            <div className="h-2 flex-1 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
              <div className="h-full rounded-full" style={{ width: `${w}%`, background: 'var(--series-1)' }} />
            </div>
          </div>
        ))}
      </section>
    </PhoneApp>
  )
}

function Expense({ title, meta, amount, type }: { title: string; meta: string; amount: number; type: 'maintenance' | 'upgrade' | 'routine' }) {
  return (
    <article className="card !p-3">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <h3 className="truncate text-[13px] font-semibold">{title}</h3>
          <p className="muted !text-[11px]">{meta}</p>
        </div>
        <p className="shrink-0 text-sm font-bold tabular-nums">{formatCurrency(amount)}</p>
      </div>
      <div className="mt-2">
        <TypeBadge type={type} />
      </div>
    </article>
  )
}

function Expenses() {
  return (
    <PhoneApp active="gastos">
      <div className="flex items-end justify-between">
        <h1 className="text-lg font-bold">Gastos</h1>
        <p className="text-xs">
          <span className="muted !text-xs">Total </span>
          <span className="font-bold tabular-nums">{formatCurrency(2139.9)}</span>
        </p>
      </div>
      <div className="flex gap-1.5 text-[11px]">
        {['Categorias', 'Tipos', 'Este ano'].map((f) => (
          <span key={f} className="rounded-lg border border-slate-300 bg-white px-2 py-1 text-slate-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300">
            {f}
          </span>
        ))}
      </div>
      <Expense title="Troca de óleo e filtro" meta={`${formatDate(daysAgo(1))} · Manutenção · ${formatKm(48200)}`} amount={389.9} type="maintenance" />
      <Expense title="Polimento técnico" meta={`${formatDate(daysAgo(9))} · Estética`} amount={450} type="upgrade" />
      <Expense title="Abastecimento" meta={`${formatDate(daysAgo(12))} · Combustível`} amount={248.5} type="routine" />
    </PhoneApp>
  )
}

function Planned() {
  return (
    <PhoneApp active="planejados">
      <h1 className="text-lg font-bold">Planejados</h1>
      <div className="card !p-3">
        <p className="muted !text-[11px]">Total estimado (3 itens)</p>
        <p className="text-xl font-bold tabular-nums">{formatCurrency(1350)}</p>
      </div>
      <article className="card !p-3">
        <div className="flex items-start justify-between gap-2">
          <div>
            <h3 className="text-[13px] font-semibold">Trocar farol para LED</h3>
            <p className="muted !text-[11px]">Peças</p>
          </div>
          <p className="text-sm font-bold tabular-nums">{formatCurrency(400)}</p>
        </div>
        <div className="mt-2 flex items-center gap-1.5">
          <TypeBadge type="upgrade" />
          <span className="rounded-full bg-red-100 px-2 py-0.5 text-[11px] font-medium text-red-800 dark:bg-red-950 dark:text-red-300">Prioridade alta</span>
        </div>
        <span className="btn-primary pointer-events-none mt-3 w-full !py-2 !text-xs">Marcar como realizado</span>
      </article>
      <article className="card !p-3">
        <div className="flex items-start justify-between gap-2">
          <div>
            <h3 className="text-[13px] font-semibold">Pneus novos</h3>
            <p className="muted !text-[11px]">Manutenção</p>
          </div>
          <p className="text-sm font-bold tabular-nums">{formatCurrency(950)}</p>
        </div>
      </article>
    </PhoneApp>
  )
}

function Gallery() {
  return (
    <PhoneApp active="galeria">
      <h1 className="text-lg font-bold">Meu carro</h1>
      <div className="relative h-72 overflow-hidden rounded-xl bg-linear-to-br from-slate-900 via-blue-800 to-blue-500">
        <span aria-hidden="true" className="absolute inset-0 flex items-center justify-center text-6xl opacity-30">🚗</span>
        <div className="absolute inset-x-0 bottom-0 flex items-center justify-between p-3 text-white">
          <span className="rounded-full bg-black/30 px-2.5 py-1 text-[11px]">Foto 2 de 8</span>
          <div className="flex gap-1.5">
            {[0, 1, 2, 3].map((i) => (
              <span key={i} className={`h-1.5 w-1.5 rounded-full ${i === 1 ? 'bg-white' : 'bg-white/40'}`} />
            ))}
          </div>
        </div>
      </div>
      <div className="grid grid-cols-4 gap-2">
        {['from-blue-700 to-blue-500', 'from-slate-900 to-blue-700', 'from-blue-500 to-blue-300', 'from-blue-700 to-slate-900'].map((g) => (
          <span key={g} className={`h-14 rounded-lg bg-linear-to-br ${g}`} />
        ))}
      </div>
    </PhoneApp>
  )
}

function Settings() {
  return (
    <PhoneApp active="ajustes">
      <h1 className="text-lg font-bold">Ajustes</h1>
      <section className="card !p-3">
        <h2 className="mb-1 text-[13px] font-semibold">Categorias</h2>
        {['Combustível', 'Manutenção', 'Seguro', 'Peças'].map((c) => (
          <div key={c} className="flex items-center justify-between border-b border-slate-100 py-2 text-[13px] last:border-0 dark:border-slate-800">
            <span>{c}</span>
            <span className="text-[11px] text-slate-400">Renomear</span>
          </div>
        ))}
      </section>
      <section className="card !p-3">
        <h2 className="mb-2 text-[13px] font-semibold">Backup dos dados</h2>
        <div className="flex gap-2">
          <span className="btn-outline pointer-events-none !px-3 !py-1.5 !text-xs">Exportar</span>
          <span className="btn-outline pointer-events-none !px-3 !py-1.5 !text-xs">Importar</span>
        </div>
      </section>
    </PhoneApp>
  )
}

const SCREENS: Record<ScreenKey, () => ReactNode> = {
  visao: Overview,
  gastos: Expenses,
  planejados: Planned,
  galeria: Gallery,
  ajustes: Settings,
}

/** A tela do app no celular para a aba `screen` (quadro de 280x596 px). */
export function PhoneScreen({ screen }: { screen: ScreenKey }) {
  const Screen = SCREENS[screen]
  return <Screen />
}
