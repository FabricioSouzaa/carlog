import { memo, type ReactNode } from 'react'
import { daysAgoISO, formatCurrency, formatDate, formatKm } from '../lib/format'
import { TypeBadge } from './ui'

/*
 * Réplicas estáticas das telas do app para a landing, com dados fictícios (nada vem de conta nenhuma).
 * Usam as mesmas classes e o mesmo TypeBadge das telas reais, para parecerem o app de verdade.
 * Desenhadas num quadro fixo de 560x360 px e reduzidas por `ScaledScreen`.
 */


const TABS = [
  { id: 'visao', label: 'Visão geral', icon: '📊' },
  { id: 'gastos', label: 'Gastos', icon: '🧾' },
  { id: 'planejados', label: 'Planejados', icon: '🗓️' },
  { id: 'ajustes', label: 'Ajustes', icon: '⚙️' },
] as const
type ScreenId = (typeof TABS)[number]['id'] | 'galeria'

/** A "janela" do app: barra de abas (como a do app) e o conteúdo da tela. */
function AppWindow({ active, children }: { active: ScreenId; children: ReactNode }) {
  return (
    <div className="flex h-[360px] w-[560px] flex-col overflow-hidden bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-100">
      <div className="flex shrink-0 items-center gap-1 border-b border-slate-200 bg-white px-4 dark:border-slate-800 dark:bg-slate-900">
        <span className="mr-3 rounded-lg px-2 py-1 text-sm font-bold">Carlog</span>
        {TABS.map((t) => (
          <span key={t.id} className={`flex items-center gap-1.5 px-2.5 py-2.5 text-[13px] font-medium ${t.id === active ? 'text-blue-600 dark:text-blue-400' : 'text-slate-500 dark:text-slate-400'}`}>
            <span aria-hidden="true">{t.icon}</span>
            {t.label}
          </span>
        ))}
      </div>
      <div className="min-h-0 flex-1 space-y-3 overflow-hidden p-4">{children}</div>
    </div>
  )
}

const Stat = ({ label, value }: { label: string; value: string }) => (
  <div className="card !p-3">
    <p className="muted !text-xs">{label}</p>
    <p className="text-lg font-bold tabular-nums">{value}</p>
  </div>
)

const MONTHS = [28, 46, 37, 63, 50, 86, 69, 44, 60, 79, 53, 100]

function Overview() {
  return (
    <AppWindow active="visao">
      <div className="grid grid-cols-3 gap-3">
        <Stat label="Total gasto" value={formatCurrency(18742.3)} />
        <Stat label="Este mês" value={formatCurrency(1230)} />
        <Stat label="Custo por km" value={formatCurrency(0.38)} />
      </div>
      <section className="card !p-3">
        <h2 className="mb-2 text-sm font-semibold">Gasto por mês (últimos 12 meses)</h2>
        <div className="flex h-24 items-end gap-2">
          {MONTHS.map((h, i) => (
            <div key={i} className="flex-1 rounded-t" style={{ height: `${h}%`, background: 'var(--series-1)' }} />
          ))}
        </div>
      </section>
      <section className="card !p-3">
        <h2 className="mb-1.5 text-sm font-semibold">Gasto por categoria</h2>
        {[
          ['Combustível', 100],
          ['Manutenção', 65],
        ].map(([n, w]) => (
          <div key={n} className="mb-1.5 flex items-center gap-2 text-xs">
            <span className="w-20 shrink-0">{n}</span>
            <div className="h-2 flex-1 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
              <div className="h-full rounded-full" style={{ width: `${w}%`, background: 'var(--series-1)' }} />
            </div>
          </div>
        ))}
      </section>
    </AppWindow>
  )
}

function ExpenseRow({ title, meta, amount, type }: { title: string; meta: string; amount: number; type: 'maintenance' | 'upgrade' | 'routine' }) {
  return (
    <article className="card !p-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="truncate text-sm font-semibold">{title}</h3>
          <p className="muted !text-xs">{meta}</p>
        </div>
        <p className="shrink-0 text-base font-bold tabular-nums">{formatCurrency(amount)}</p>
      </div>
      <div className="mt-2 flex items-center justify-between">
        <TypeBadge type={type} />
        <span className="text-xs text-slate-400">Editar · Excluir</span>
      </div>
    </article>
  )
}

function Expenses() {
  return (
    <AppWindow active="gastos">
      <div className="flex items-end justify-between">
        <h1 className="text-xl font-bold">Gastos</h1>
        <p className="text-sm">
          <span className="muted">Total </span>
          <span className="font-bold tabular-nums">{formatCurrency(2139.9)}</span>
        </p>
      </div>
      <div className="flex gap-2 text-xs">
        {['Todas as categorias', 'Todos os tipos', 'Este ano'].map((f) => (
          <span key={f} className="rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-slate-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300">
            {f}
          </span>
        ))}
      </div>
      <ExpenseRow title="Troca de óleo e filtro" meta={`${formatDate(daysAgoISO(1))} · Manutenção · ${formatKm(48200)}`} amount={389.9} type="maintenance" />
      <ExpenseRow title="Polimento técnico" meta={`${formatDate(daysAgoISO(9))} · Lavagem/Estética`} amount={450} type="upgrade" />
    </AppWindow>
  )
}

function Planned() {
  return (
    <AppWindow active="planejados">
      <h1 className="text-xl font-bold">Planejados</h1>
      <div className="card !p-3">
        <p className="muted !text-xs">Total estimado (3 itens)</p>
        <p className="text-2xl font-bold tabular-nums">{formatCurrency(1350)}</p>
      </div>
      <article className="card !p-3">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="text-sm font-semibold">Trocar farol para LED</h3>
            <p className="muted !text-xs">Peças</p>
          </div>
          <p className="font-bold tabular-nums">{formatCurrency(400)}</p>
        </div>
        <div className="mt-2 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <TypeBadge type="upgrade" />
            <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-800 dark:bg-red-950 dark:text-red-300">Prioridade alta</span>
          </div>
          <span className="btn-primary pointer-events-none !px-2.5 !py-1.5 !text-xs">Marcar como realizado</span>
        </div>
      </article>
      <article className="card !p-3">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="text-sm font-semibold">Pneus novos</h3>
            <p className="muted !text-xs">Manutenção</p>
          </div>
          <p className="font-bold tabular-nums">{formatCurrency(950)}</p>
        </div>
      </article>
    </AppWindow>
  )
}

function Gallery() {
  return (
    <AppWindow active="galeria">
      <h1 className="text-xl font-bold">Meu carro</h1>
      <div className="relative h-60 overflow-hidden rounded-xl bg-linear-to-br from-slate-900 via-blue-800 to-blue-500">
        <div className="absolute inset-x-0 bottom-0 flex items-center justify-between p-3 text-white">
          <span className="rounded-full bg-black/30 px-2.5 py-1 text-xs">Foto 2 de 8</span>
          <div className="flex gap-1.5">
            {[0, 1, 2, 3].map((i) => (
              <span key={i} className={`h-1.5 w-1.5 rounded-full ${i === 1 ? 'bg-white' : 'bg-white/40'}`} />
            ))}
          </div>
        </div>
        <span aria-hidden="true" className="absolute inset-0 flex items-center justify-center text-6xl opacity-30">🚗</span>
      </div>
    </AppWindow>
  )
}

function Settings() {
  return (
    <AppWindow active="ajustes">
      <h1 className="text-xl font-bold">Ajustes</h1>
      <section className="card !p-3">
        <h2 className="mb-1.5 text-sm font-semibold">Categorias</h2>
        {['Combustível', 'Manutenção', 'Seguro'].map((c) => (
          <div key={c} className="flex items-center justify-between border-b border-slate-100 py-1.5 text-sm last:border-0 dark:border-slate-800">
            <span>{c}</span>
            <span className="text-xs text-slate-400">Renomear · Remover</span>
          </div>
        ))}
      </section>
      <section className="card !p-3">
        <h2 className="mb-1.5 text-sm font-semibold">Backup dos dados</h2>
        <div className="flex gap-2">
          <span className="btn-outline pointer-events-none !px-3 !py-1.5 !text-xs">Exportar</span>
          <span className="btn-outline pointer-events-none !px-3 !py-1.5 !text-xs">Importar</span>
        </div>
      </section>
    </AppWindow>
  )
}

const SCREENS: Record<'visao' | 'gastos' | 'planejados' | 'galeria' | 'ajustes', () => ReactNode> = {
  visao: Overview,
  gastos: Expenses,
  planejados: Planned,
  galeria: Gallery,
  ajustes: Settings,
}

export type ScreenKey = keyof typeof SCREENS

/** Mostra a réplica reduzida (a janela tem 560x360; aqui ela é encolhida e ganha moldura). */
export const ScaledScreen = memo(function ScaledScreen({ screen }: { screen: ScreenKey }) {
  const Screen = SCREENS[screen]
  return (
    <div aria-hidden="true" className="h-[180px] w-[280px] overflow-hidden rounded-xl border border-slate-200 shadow-[0_8px_24px_rgba(15,23,42,0.12)] lg:h-[245px] lg:w-[381px] dark:border-slate-700">
      <div className="origin-top-left scale-50 lg:scale-[0.68]">
        <Screen />
      </div>
    </div>
  )
})
