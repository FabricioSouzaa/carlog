import { useEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode } from 'react'
import { cameraAt, overview, union, zoomTo, type Rect } from '../lib/camera'
import { formatCurrency, formatDate, todayISO } from '../lib/format'
import { ramp } from '../lib/wheel'
import { TypeBadge } from './ui'
import { useMediaQuery } from './useMediaQuery'
import { useWheel } from './useWheel'

const TITLE = 'Raio-X do seu carro.'
const SUBTITLE = 'Cada real, mês a mês e categoria por categoria, sem montar planilha.'
const BEAT_TITLE = ['Os totais', 'Mês a mês', 'Para onde vai', 'Últimos gastos']
const BEAT_TEXT = ['Geral, do mês, do ano e o que ainda vem.', 'Quanto você gastou em cada mês.', 'Por categoria e por tipo.', 'Cada lançamento, com data e tipo.']
/** Peso de rolagem de cada trecho entre momentos: o do gráfico mensal, com 12 barras, ganha um pouco mais. */
const WEIGHTS = [1, 1.3, 1.1, 1]
const LEN = WEIGHTS.reduce((a, b) => a + b, 0)

const MONTHS = [28, 46, 37, 63, 50, 86, 69, 44, 60, 79, 53, 100]
const MONTH_LABELS = ['nov', 'dez', 'jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out']
const CATEGORIES = [
  { name: 'Combustível', total: 7980, pct: 1 },
  { name: 'Manutenção', total: 5210.4, pct: 0.65 },
  { name: 'Seguro', total: 3150, pct: 0.4 },
]
const TYPES = [
  { name: 'Manutenção', pct: 46, color: 'var(--series-1)' },
  { name: 'Valorização', pct: 18, color: 'var(--series-2)' },
  { name: 'Rotina', pct: 36, color: 'var(--series-3)' },
]
const daysAgo = (n: number) => {
  const [y, m, d] = todayISO().split('-').map(Number)
  const date = new Date(Date.UTC(y, m - 1, d - n))
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}-${String(date.getUTCDate()).padStart(2, '0')}`
}
const LAST = [
  {
    title: 'Troca de óleo e filtro',
    meta: `${formatDate(daysAgo(1))} · Manutenção`,
    amount: 389.9,
    type: 'maintenance' as const,
  },
  {
    title: 'Polimento técnico',
    meta: `${formatDate(daysAgo(9))} · Estética`,
    amount: 450,
    type: 'upgrade' as const,
  },
  {
    title: 'Abastecimento',
    meta: `${formatDate(daysAgo(12))} · Combustível`,
    amount: 248.5,
    type: 'routine' as const,
  },
]
const PLANNED = [
  {
    title: 'Trocar farol para LED',
    amount: 400,
    priority: 'Alta',
    style: 'bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300',
  },
  {
    title: 'Pneus novos',
    amount: 950,
    priority: 'Média',
    style: 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300',
  },
]
const TABS = ['📊 Visão geral', '🧾 Gastos', '🗓️ Planejados', '⚙️ Ajustes']

const ease = (x: number) => 1 - Math.pow(1 - x, 3)
/** Quanto a câmera dá de folga em volta da parte em foco, e o zoom máximo. */
const FILL = 0.88
const MAX_ZOOM = 1.8

/** Anel azul de destaque que acende em volta da parte em foco. */
const ring = (on: number): CSSProperties => ({
  boxShadow: `0 0 0 ${on * 2.5}px rgb(59 130 246 / ${on * 0.9}), 0 ${on * 14}px ${on * 34}px rgb(37 99 235 / ${on * 0.22})`,
})

type Reg = Record<'stat1' | 'stat2' | 'stat3' | 'stat4' | 'chart' | 'cats' | 'last', HTMLElement | null>

/** Posição e tamanho de um elemento dentro do quadro (somando os deslocamentos até chegar nele). */
function rectIn(el: HTMLElement, board: HTMLElement): Rect {
  let x = 0
  let y = 0
  for (let e: HTMLElement | null = el; e && e !== board; e = e.offsetParent as HTMLElement | null) {
    x += e.offsetLeft
    y += e.offsetTop
  }
  return { x, y, w: el.offsetWidth, h: el.offsetHeight }
}

function Stat({ label, hint, value, on, dim, reg }: { label: string; hint: string; value: string; on: number; dim: number; reg: (el: HTMLElement | null) => void }) {
  return (
    <div ref={reg} className="card !p-3.5" style={{ ...ring(on), opacity: dim }}>
      <p className="muted !text-xs">{label}</p>
      <p className="text-xl font-bold tabular-nums">{value}</p>
      <p className="text-[11px] text-slate-400 dark:text-slate-500">{hint}</p>
    </div>
  )
}

function Panel({ title, on, dim, className = '', children }: { title: string; on: number; dim: number; className?: string; children: ReactNode }) {
  return (
    <section className={`card !p-4 ${className}`} style={{ ...ring(on), opacity: dim }}>
      <h3 className="mb-2 text-sm font-semibold">{title}</h3>
      {children}
    </section>
  )
}

/**
 * Seção "Raio-X do seu carro": a tela de Visão geral aparece inteira, como um quadro, e uma câmera dá zoom em cada
 * parte (totais, gráfico do ano, categorias e tipos, custo por km). Quando a câmera chega, a parte carrega: números
 * contam, barras crescem. As outras partes ficam apagadas enquanto isso. A conta da câmera está em `lib/camera.ts` e a da
 * rolagem em `useWheel`. Sem movimento (ou sem `abs()`), mostra o quadro completo, sem zoom.
 */
export function FeatureOverview() {
  const [pos, setPos] = useState(0)
  const { ref } = useWheel(WEIGHTS.length + 1, {
    tau: 170,
    dwell: 0.2,
    weights: WEIGHTS,
    staticPosition: WEIGHTS.length,
    onPosition: (p) => setPos(Math.round(p * 100) / 100),
  })
  const wide = useMediaQuery('(min-width: 1024px)')
  const boardW = wide ? 980 : 760

  const view = useRef<HTMLDivElement>(null)
  const board = useRef<HTMLDivElement>(null)
  const copy = useRef<HTMLDivElement>(null)
  const reg = useRef<Reg>({
    stat1: null,
    stat2: null,
    stat3: null,
    stat4: null,
    chart: null,
    cats: null,
    last: null,
  })
  const at = (k: keyof Reg) => (el: HTMLElement | null) => {
    reg.current[k] = el
  }
  const [layout, setLayout] = useState<{
    pinned: boolean
    view: { w: number; h: number }
    board: { w: number; h: number }
    parts: Rect[]
  } | null>(null)

  // mede o quadro e a posição de cada parte; refaz quando algo muda de tamanho (fontes, giro da tela, texto em cima no celular)
  useEffect(() => {
    const measure = () => {
      const b = board.current
      const v = view.current
      const stage = ref.current?.firstElementChild as HTMLElement | null
      if (!b || !v || !stage) return
      const r = reg.current
      if (!r.stat1 || !r.stat2 || !r.stat3 || !r.chart || !r.cats || !r.last) return
      const pinned = getComputedStyle(stage).position === 'sticky'
      const parts: Rect[] = [union([rectIn(r.stat1, b), rectIn(r.stat2, b), rectIn(r.stat3, b)]), rectIn(r.chart, b), rectIn(r.cats, b), rectIn(r.last, b)]
      const above = wide ? 0 : (copy.current?.offsetHeight ?? 0) + 12
      const h = Math.max(260, Math.min(wide ? 640 : 520, stage.clientHeight - above - 56))
      setLayout({
        pinned,
        view: { w: v.clientWidth, h },
        board: { w: b.offsetWidth, h: b.offsetHeight },
        parts,
      })
    }
    measure()
    window.addEventListener('resize', measure)
    const observer = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(measure)
    for (const el of [ref.current?.firstElementChild, view.current, board.current, copy.current]) if (el) observer?.observe(el)
    return () => {
      window.removeEventListener('resize', measure)
      observer?.disconnect()
    }
  }, [ref, wide, boardW])

  const shots = useMemo(() => {
    if (!layout) return null
    const first = overview(layout.board, layout.view)
    return [first, ...layout.parts.map((p) => zoomTo(p, layout.view, first.scale, MAX_ZOOM, FILL))]
  }, [layout])

  const pinned = !!layout?.pinned && !!shots
  const cam = pinned && shots ? cameraAt(pos, shots) : null
  const focus = cam?.focus ?? [0, 0, 0, 0]
  const zoom = cam?.zoom ?? 0
  // partes fora de foco ficam apagadas só enquanto a câmera está de perto
  const dim = (k: number) => 1 - 0.62 * zoom * (1 - focus[k])
  const r = (from: number, to: number) => ramp(pos, from, to)
  const count = (target: number, from: number, to: number) => formatCurrency(target * ease(r(from, to)))
  const other = 1 - 0.62 * zoom // partes que nunca são o foco (ex.: o card de planejados ao lado dos últimos gastos)

  const camStyle: CSSProperties = cam
    ? {
        position: 'absolute',
        top: 0,
        left: 0,
        width: boardW,
        transformOrigin: '0 0',
        transform: `translate(${cam.shot.x}px, ${cam.shot.y}px) scale(${cam.shot.scale})`,
      }
    : {}

  return (
    <section
      ref={ref}
      aria-labelledby="visao-titulo"
      className="wheel-section over-section relative"
      style={{ '--p': 0, '--n': WEIGHTS.length + 1, '--len': LEN } as CSSProperties}
    >
      <div className="wheel-stage isolate flex items-center">
        <div
          aria-hidden="true"
          className="over-bg"
          style={{
            backgroundPosition: cam ? `${cam.shot.x * 0.28}px ${cam.shot.y * 0.28}px` : undefined,
          }}
        />
        <div className="mx-auto grid w-full max-w-6xl items-center gap-3 px-4 lg:grid-cols-[340px_1fr] lg:gap-12">
          <div ref={copy}>
            <p className="text-[13px] font-semibold tracking-[0.18em] text-blue-600 uppercase dark:text-blue-400">Visão geral</p>
            <h2 id="visao-titulo" className="font-display mt-1.5 text-[28px] leading-[1.1] font-bold tracking-tight lg:mt-2 lg:text-5xl">
              {TITLE}
            </h2>
            <p className="muted mt-3 hidden !text-base sm:block lg:!text-[17px]">{SUBTITLE}</p>
            {/* a parte em foco: número, nome e uma frase; cada uma aparece quando a câmera chega nela */}
            <div className="relative mt-3 h-[60px] lg:mt-9 lg:h-24">
              {BEAT_TITLE.map((label, i) => {
                const d = pos - (i + 0.72)
                return (
                  <div
                    key={label}
                    className="demo-legend absolute inset-x-0 top-0"
                    style={{
                      opacity: Math.max(0, 1 - Math.abs(d) * 2.2),
                      transform: `translateY(${-d * 22}px)`,
                    }}
                  >
                    <p className="font-display text-sm font-bold text-blue-600 dark:text-blue-400">0{i + 1} / 04</p>
                    <p className="font-display mt-0.5 text-xl font-bold lg:mt-1 lg:text-[28px]">{label}</p>
                    <p className="muted mt-0.5 lg:mt-1 lg:!text-[15px]">{BEAT_TEXT[i]}</p>
                  </div>
                )
              })}
            </div>
          </div>

          {/* o "visor": mostra um pedaço do quadro; a câmera move e aproxima o quadro dentro dele */}
          <div
            ref={view}
            aria-hidden="true"
            className={`relative w-full ${pinned ? 'over-view overflow-hidden' : ''}`}
            style={pinned && layout ? { height: layout.view.h } : undefined}
          >
            <div
              ref={board}
              className="rounded-[22px] border border-slate-200 bg-slate-50 shadow-[0_30px_80px_rgba(15,23,42,0.16)] dark:border-slate-800 dark:bg-slate-950"
              style={camStyle}
            >
              <div className="flex h-12 items-center gap-1 border-b border-slate-200 bg-white px-4 dark:border-slate-800 dark:bg-slate-900">
                <span className="font-display mr-3 text-base font-bold">Carlog</span>
                {TABS.map((t, i) => (
                  <span key={t} className={`px-2 text-[13px] font-medium ${i === 0 ? 'text-blue-600 dark:text-blue-400' : 'text-slate-500'}`}>
                    {t}
                  </span>
                ))}
              </div>
              <div className="space-y-3 p-4">
                <div className="grid grid-cols-4 gap-3">
                  <Stat reg={at('stat1')} label="Total gasto" hint="desde o 1º gasto" value={count(18742.3, 0.5, 0.95)} on={focus[0]} dim={dim(0)} />
                  <Stat reg={at('stat2')} label="Este mês" hint="outubro de 2026" value={count(1230, 0.5, 0.95)} on={focus[0]} dim={dim(0)} />
                  <Stat reg={at('stat3')} label="Este ano" hint="2026" value={count(9860.45, 0.5, 0.95)} on={focus[0]} dim={dim(0)} />
                  <Stat reg={at('stat4')} label="Planejado pendente" hint="3 itens" value={count(1350, 0.5, 0.95)} on={focus[0]} dim={dim(0)} />
                </div>

                <div className="grid grid-cols-[1.45fr_1fr] gap-3">
                  <div ref={at('chart')} className="flex">
                    <Panel title="Gasto por mês (últimos 12 meses)" on={focus[1]} dim={dim(1)} className="flex w-full flex-col">
                      <div className="relative min-h-40 flex-1">
                        <div className="flex h-full items-end gap-2">
                          {MONTHS.map((h, i) => {
                            const a = ease(r(1.5 + i * 0.025, 1.7 + i * 0.025))
                            return (
                              <div
                                key={i}
                                className="flex-1 rounded-t"
                                style={{
                                  height: `${Math.max(2, h * a)}%`,
                                  background: i === 11 && r(1.9, 1.98) > 0 ? '#2563eb' : 'var(--series-1)',
                                }}
                              />
                            )
                          })}
                        </div>
                        <div
                          className="absolute -top-3 right-9 z-10 rounded-lg bg-slate-900 px-2.5 py-1.5 text-white shadow-lg"
                          style={{
                            opacity: r(1.9, 1.98),
                            transform: `translateY(${(1 - r(1.9, 1.98)) * 8}px)`,
                          }}
                        >
                          <p className="text-[10px] text-slate-300">out/26</p>
                          <p className="text-sm font-bold tabular-nums">R$ 1.230,00</p>
                        </div>
                      </div>
                      <div className="mt-1.5 flex justify-between text-[10px] text-slate-400">
                        {MONTH_LABELS.filter((_, i) => i % 3 === 0 || i === 11).map((m) => (
                          <span key={m}>{m}</span>
                        ))}
                      </div>
                    </Panel>
                  </div>

                  <div ref={at('cats')} className="space-y-3">
                    <Panel title="Gasto por categoria" on={focus[2]} dim={dim(2)}>
                      {CATEGORIES.map((c, i) => {
                        const a = ease(r(2.5 + i * 0.07, 2.75 + i * 0.07))
                        return (
                          <div key={c.name} className="mb-1.5 last:mb-0">
                            <div className="mb-1 flex justify-between text-xs">
                              <span>{c.name}</span>
                              <span className="font-medium tabular-nums" style={{ opacity: a }}>
                                {formatCurrency(c.total)}
                              </span>
                            </div>
                            <div className="h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                              <div
                                className="h-full rounded-full"
                                style={{
                                  width: `${c.pct * a * 100}%`,
                                  background: 'var(--series-1)',
                                }}
                              />
                            </div>
                          </div>
                        )
                      })}
                    </Panel>
                    <Panel title="Gasto por tipo" on={focus[2]} dim={dim(2)}>
                      <div className="flex h-3 gap-0.5 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                        {TYPES.map((t) => (
                          <div
                            key={t.name}
                            style={{
                              flex: `${t.pct * ease(r(2.7, 2.95))} 1 0`,
                              background: t.color,
                            }}
                          />
                        ))}
                      </div>
                      <ul className="mt-2 space-y-1 text-xs">
                        {TYPES.map((t) => (
                          <li key={t.name} className="flex items-center justify-between" style={{ opacity: r(2.75, 2.97) }}>
                            <span className="flex items-center gap-2">
                              <span className="inline-block size-2.5 rounded-sm" style={{ background: t.color }} />
                              {t.name}
                            </span>
                            <span className="font-medium tabular-nums">{t.pct}%</span>
                          </li>
                        ))}
                      </ul>
                    </Panel>
                  </div>
                </div>

                <div className="grid grid-cols-[1.45fr_1fr] gap-3">
                  <div ref={at('last')} className="flex">
                    <Panel title="Últimos gastos" on={focus[3]} dim={dim(3)} className="w-full">
                      <ul className="space-y-2">
                        {LAST.map((e, i) => {
                          const a = ease(r(3.5 + i * 0.12, 3.7 + i * 0.12))
                          return (
                            <li
                              key={e.title}
                              className="flex items-center justify-between gap-3"
                              style={{
                                opacity: a,
                                transform: `translateY(${(1 - a) * 10}px)`,
                              }}
                            >
                              <div className="min-w-0">
                                <p className="truncate text-[13px] font-semibold">{e.title}</p>
                                <p className="muted !text-[11px]">{e.meta}</p>
                              </div>
                              <div className="flex shrink-0 items-center gap-2">
                                <TypeBadge type={e.type} />
                                <span className="w-24 text-right text-sm font-bold tabular-nums">{formatCurrency(e.amount)}</span>
                              </div>
                            </li>
                          )
                        })}
                      </ul>
                    </Panel>
                  </div>
                  <Panel title="Próximos gastos" on={0} dim={other * (0.3 + 0.7 * r(3.6, 3.9))}>
                    <ul className="space-y-2">
                      {PLANNED.map((p) => (
                        <li key={p.title} className="flex items-center justify-between gap-2">
                          <div className="min-w-0">
                            <p className="truncate text-[13px] font-semibold">{p.title}</p>
                            <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${p.style}`}>Prioridade {p.priority.toLowerCase()}</span>
                          </div>
                          <span className="shrink-0 text-sm font-bold tabular-nums">{formatCurrency(p.amount)}</span>
                        </li>
                      ))}
                    </ul>
                  </Panel>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
