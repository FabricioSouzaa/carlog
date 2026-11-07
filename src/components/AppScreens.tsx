import { createContext, useContext, useLayoutEffect, useRef, useState, type ReactNode } from 'react'
import { daysAgoISO, formatCurrency, formatDate, formatKm } from '../lib/format'
import { TypeBadge } from './ui'

/*
 * Réplicas estáticas das telas do app para a landing, com dados fictícios (nada vem de conta nenhuma).
 * Usam as mesmas classes e o mesmo TypeBadge das telas reais, para parecerem o app de verdade.
 * Desenhadas num quadro fixo de 560x360 px e ajustadas à largura disponível por `FitScreen`.
 */


const TABS = [
  { id: 'visao', label: 'Visão geral', icon: '📊' },
  { id: 'gastos', label: 'Gastos', icon: '🧾' },
  { id: 'planejados', label: 'Planejados', icon: '🗓️' },
  { id: 'ajustes', label: 'Ajustes', icon: '⚙️' },
] as const
export type TabId = (typeof TABS)[number]['id']
type ScreenId = TabId

/**
 * Faz as abas da réplica funcionarem (a demonstração da seção 2 as clica sozinha e deixa a pessoa clicar também).
 * Sem esse contexto as abas são só desenho, como nas outras seções.
 */
export interface TabsControl {
  onSelect: (id: TabId) => void
  /** Recebe o elemento de cada aba, para a demonstração saber onde apontar o cursor. */
  setTabEl: (id: TabId, el: HTMLElement | null) => void
}
const TabsControlContext = createContext<TabsControl | null>(null)
export const TabsControlProvider = TabsControlContext.Provider

/** A "janela" do app: barra de abas (como a do app) e o conteúdo da tela (cada tela devolve só o conteúdo). */
function AppWindow({ active, children }: { active: ScreenId; children: ReactNode }) {
  const control = useContext(TabsControlContext)
  return (
    <div className="flex h-[360px] w-[560px] flex-col overflow-hidden bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-100">
      <div role={control ? 'tablist' : undefined} aria-label={control ? 'Telas do app' : undefined} className="flex shrink-0 items-center gap-1 border-b border-slate-200 bg-white px-4 dark:border-slate-800 dark:bg-slate-900">
        <span className="mr-3 rounded-lg px-2 py-1 text-sm font-bold">Carlog</span>
        {TABS.map((t) => {
          const cls = `flex items-center gap-1.5 px-2.5 py-2.5 text-[13px] font-medium ${t.id === active ? 'text-blue-600 dark:text-blue-400' : 'text-slate-500 dark:text-slate-400'}`
          const inner = (
            <>
              <span aria-hidden="true">{t.icon}</span>
              {t.label}
            </>
          )
          return control ? (
            <button key={t.id} type="button" role="tab" aria-selected={t.id === active} ref={(el) => control.setTabEl(t.id, el)} onClick={() => control.onSelect(t.id)} className={`${cls} cursor-pointer hover:text-slate-900 dark:hover:text-slate-100`}>
              {inner}
            </button>
          ) : (
            <span key={t.id} className={cls}>
              {inner}
            </span>
          )
        })}
      </div>
      {/* a chave refaz só o conteúdo ao trocar de aba (e dispara o fade); a barra de abas é a mesma, então o foco do teclado não se perde */}
      <div key={active} role={control ? 'tabpanel' : undefined} className="tab-screen-in min-h-0 flex-1 space-y-3 overflow-hidden p-4">
        {children}
      </div>
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
    <>
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
    </>
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
    <>
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
    </>
  )
}

function Planned() {
  return (
    <>
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
    </>
  )
}

function Settings() {
  return (
    <>
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
    </>
  )
}

const SCREENS: Record<TabId, () => ReactNode> = {
  visao: Overview,
  gastos: Expenses,
  planejados: Planned,
  ajustes: Settings,
}

export type ScreenKey = keyof typeof SCREENS

/**
 * Mostra a réplica ajustada à largura do espaço disponível: ela é desenhada em 560x360 e ganha a escala certa (tudo é DOM, então
 * continua nítida em qualquer tamanho). A altura acompanha a escala.
 */
export function FitScreen({ screen }: { screen: TabId }) {
  const Screen = SCREENS[screen]
  const box = useRef<HTMLDivElement>(null)
  const [scale, setScale] = useState(1)
  useLayoutEffect(() => {
    const el = box.current
    if (!el) return
    const fit = () => setScale(el.clientWidth / 560)
    fit()
    const observer = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(fit)
    observer?.observe(el)
    return () => observer?.disconnect()
  }, [])
  return (
    <div ref={box} className="relative w-full overflow-hidden" style={{ height: 360 * scale }}>
      <div className="origin-top-left" style={{ width: 560, height: 360, transform: `scale(${scale})` }}>
        <AppWindow active={screen}>
          <Screen />
        </AppWindow>
      </div>
    </div>
  )
}
