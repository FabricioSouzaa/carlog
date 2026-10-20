import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react'
import { formatCurrency } from '../lib/format'
import { ramp } from '../lib/wheel'
import { TypeBadge } from './ui'
import { useWheel } from './useWheel'

const TITLE = 'Raio-X do seu carro.'
const SUBTITLE = 'Cada real, mês a mês e categoria por categoria, sem montar planilha.'
const BEATS = ['Totais', 'Mês a mês', 'Para onde vai', 'Custo por km']
const BEAT_TITLE = ['Os totais', 'Mês a mês', 'Para onde vai', 'Custo por km']
const BEAT_TEXT = ['Geral, do mês e do ano.', 'Quanto você gastou em cada mês.', 'Por categoria e por tipo.', 'Quanto custa cada km rodado.']
/** Peso de rolagem de cada trecho entre momentos: o do gráfico mensal, com 12 barras, ganha um pouco mais. */
const WEIGHTS = [1, 1.3, 1.1, 1]
const LEN = WEIGHTS.reduce((a, b) => a + b, 0)

const MONTHS = [28, 46, 37, 63, 50, 86, 69, 44, 60, 79, 53, 100]
const MONTH_LABELS = ['nov', 'dez', 'jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out']
const CATEGORIES = [
  { name: 'Combustível', total: 7980, pct: 1 },
  { name: 'Manutenção', total: 5210.4, pct: 0.65 },
  { name: 'Seguro', total: 3150, pct: 0.4 },
  { name: 'Peças', total: 1640.9, pct: 0.2 },
]
const TYPES = [
  { name: 'Manutenção', pct: 46, color: 'var(--series-1)' },
  { name: 'Valorização', pct: 18, color: 'var(--series-2)' },
  { name: 'Rotina', pct: 36, color: 'var(--series-3)' },
]
const TABS = ['📊 Visão geral', '🧾 Gastos', '🗓️ Planejados', '⚙️ Ajustes']

const ease = (x: number) => 1 - Math.pow(1 - x, 3)

/** Anel azul de destaque que acende em volta de uma parte do painel. */
const ring = (on: number): CSSProperties => ({ boxShadow: `0 0 0 ${on * 2.5}px rgb(59 130 246 / ${on * 0.9}), 0 ${on * 14}px ${on * 34}px rgb(37 99 235 / ${on * 0.22})` })

function Stat({ label, hint, value, on, big = false }: { label: string; hint: string; value: string; on: number; big?: boolean }) {
  return (
    <div className="card !p-3 lg:!p-3.5" style={ring(on)}>
      <p className="muted !text-[11px] lg:!text-xs">{label}</p>
      <p className={`font-bold tabular-nums ${big ? 'text-blue-600 dark:text-blue-400' : ''} text-base lg:text-xl`}>{value}</p>
      <p className="text-[10px] text-slate-400 lg:text-[11px] dark:text-slate-500">{hint}</p>
    </div>
  )
}

function Panel({ title, on = 0, className = '', children }: { title: string; on?: number; className?: string; children: ReactNode }) {
  return (
    <section className={`card !p-3 lg:!p-4 ${className}`} style={ring(on)}>
      <h3 className="mb-2 text-[13px] font-semibold lg:text-sm">{title}</h3>
      {children}
    </section>
  )
}

/**
 * Seção "Raio-X do seu carro": a tela de Visão geral do app fica fixa e, conforme você rola, se monta sozinha em quatro
 * momentos: os números contam, as barras do ano crescem, as categorias e os tipos se enchem e o custo por km acende.
 * Mesma conta de rolagem do seletor e da demonstração (`useWheel`). Sem movimento, mostra o painel completo.
 */
export function FeatureOverview() {
  const [pos, setPos] = useState(0)
  const { ref, goTo } = useWheel(WEIGHTS.length + 1, { tau: 170, dwell: 0.2, weights: WEIGHTS, staticPosition: WEIGHTS.length, onPosition: (p) => setPos(Math.round(p * 100) / 100) })
  // momento atual (0 a 3); -1 antes de começar
  const step = pos < 0.06 ? -1 : Math.max(0, Math.min(BEATS.length - 1, Math.round(pos) - 1))
  const r = (from: number, to: number) => ramp(pos, from, to)
  // destaque de uma parte: acende ao chegar no momento e apaga ao sair
  const hl = (beat: number) => Math.min(r(beat - 0.25, beat), 1 - r(beat + 0.55, beat + 0.9))

  const win = useRef<HTMLDivElement>(null)
  const copy = useRef<HTMLDivElement>(null)
  const track = useRef<HTMLOListElement>(null)
  const [scale, setScale] = useState(1)
  const [naturalH, setNaturalH] = useState(0)
  // o painel tem a altura do seu conteúdo; se a tela for baixa (ou o texto estiver em cima, no celular) ele encolhe para caber
  useEffect(() => {
    const measure = () => {
      const inner = win.current
      const stage = ref.current?.firstElementChild as HTMLElement | null
      if (!inner || !stage) return
      setNaturalH(inner.offsetHeight)
      if (getComputedStyle(stage).position !== 'sticky') return setScale(1)
      const stacked = !window.matchMedia('(min-width: 1024px)').matches // no celular o texto fica acima do painel
      const above = (stacked && copy.current ? copy.current.offsetHeight + 12 : 0) + (track.current ? track.current.offsetHeight + parseFloat(getComputedStyle(track.current).marginBottom) : 0)
      setScale(Math.max(0.55, Math.min(1, (stage.clientHeight - above - 56) / inner.offsetHeight)))
    }
    measure()
    window.addEventListener('resize', measure)
    const observer = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(measure)
    const stage = ref.current?.firstElementChild
    if (stage) observer?.observe(stage)
    if (track.current) observer?.observe(track.current)
    if (copy.current) observer?.observe(copy.current)
    if (win.current) observer?.observe(win.current)
    return () => {
      window.removeEventListener('resize', measure)
      observer?.disconnect()
    }
  }, [ref])

  const count = (target: number, from: number, to: number) => formatCurrency(target * ease(r(from, to)))
  const kmShown = r(3.1, 3.9)

  return (
    <section ref={ref} aria-labelledby="visao-titulo" className="wheel-section over-section relative" style={{ '--p': 0, '--n': WEIGHTS.length + 1, '--len': LEN } as CSSProperties}>
      <div className="wheel-stage flex items-center">
        <div className="mx-auto grid w-full max-w-6xl items-center gap-3 px-4 lg:grid-cols-[380px_1fr] lg:gap-16">
          <div ref={copy}>
            <p className="text-[13px] font-semibold tracking-[0.18em] text-blue-600 uppercase dark:text-blue-400">Visão geral</p>
            <h2 id="visao-titulo" className="font-display mt-1.5 text-[28px] leading-[1.1] font-bold tracking-tight lg:mt-2 lg:text-5xl">{TITLE}</h2>
            <p className="muted mt-3 hidden !text-base sm:block lg:!text-[17px]">{SUBTITLE}</p>
            {/* o momento em foco: número, nome e uma frase */}
            <div className="relative mt-3 h-[60px] lg:mt-9 lg:h-24">
              {BEAT_TITLE.map((label, i) => {
                const d = pos - (i + 1)
                return (
                  <div key={label} className="demo-legend absolute inset-x-0 top-0" style={{ opacity: Math.max(0, 1 - Math.abs(d) * 1.7), transform: `translateY(${-d * 22}px)` }}>
                    <p className="font-display text-sm font-bold text-blue-600 dark:text-blue-400">0{i + 1} / 04</p>
                    <p className="font-display mt-0.5 text-xl font-bold lg:mt-1 lg:text-[28px]">{label}</p>
                    <p className="muted mt-0.5 lg:mt-1 lg:!text-[15px]">{BEAT_TEXT[i]}</p>
                  </div>
                )
              })}
            </div>
          </div>

          <div className="mx-auto w-full max-w-[720px]">
            {/* trilha de 4 momentos */}
            <ol ref={track} className="demo-track relative mb-3 justify-between lg:mb-6" aria-label="Momentos">
              <span aria-hidden="true" className="absolute top-3.5 right-3.5 left-3.5 h-0.5 rounded-full bg-slate-300 dark:bg-white/15" />
              <span aria-hidden="true" className="absolute top-3.5 left-3.5 h-0.5 rounded-full bg-linear-to-r from-blue-600 to-blue-400" style={{ width: `calc((100% - 28px) * ${r(1, 4)})` }} />
              {BEATS.map((label, i) => {
                const done = i < step
                const now = i === step
                return (
                  <li key={label} className="relative z-10 flex w-16 flex-col items-center">
                    <button
                      type="button"
                      onClick={() => goTo(i + 1)}
                      aria-label={label}
                      aria-current={now ? 'step' : undefined}
                      className={`flex size-7 items-center justify-center rounded-full border text-xs font-bold transition-all ${now ? 'scale-125 border-blue-300 bg-blue-500 text-white shadow-[0_0_0_5px_rgb(59_130_246_/_0.25)]' : done ? 'border-blue-500 bg-blue-600 text-white' : 'border-slate-300 bg-white text-slate-500 hover:text-slate-700 dark:border-white/25 dark:bg-slate-900/70 dark:text-slate-400'}`}
                    >
                      {done ? '✓' : i + 1}
                    </button>
                    <span className={`mt-2.5 hidden text-center text-xs font-medium sm:block ${now ? 'text-slate-900 dark:text-white' : 'text-slate-500'}`}>{label}</span>
                  </li>
                )
              })}
            </ol>

            <div className="relative w-full" style={{ height: naturalH ? naturalH * scale : undefined }}>
              <div ref={win} className="absolute top-0 left-0 origin-top-left" style={{ width: `${100 / scale}%`, transform: `scale(${scale})` }}>
                <div aria-hidden="true" className="relative w-full overflow-hidden rounded-[22px] border border-slate-200 bg-slate-50 shadow-[0_30px_80px_rgba(15,23,42,0.16)] dark:border-slate-800 dark:bg-slate-950">
                  <div className="flex h-12 items-center gap-1 border-b border-slate-200 bg-white px-4 dark:border-slate-800 dark:bg-slate-900">
                    <span className="font-display mr-3 text-base font-bold">Carlog</span>
                    {TABS.map((t, i) => (
                      <span key={t} className={`hidden px-2 text-[13px] font-medium sm:block ${i === 0 ? 'text-blue-600 dark:text-blue-400' : 'text-slate-500'}`}>{t}</span>
                    ))}
                  </div>
                  <div className="space-y-2.5 p-3 lg:space-y-3 lg:p-4">
                    <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4 lg:gap-3">
                      <Stat label="Total gasto" hint="desde o 1º gasto" value={count(18742.3, 0.1, 0.9)} on={hl(1)} />
                      <Stat label="Este mês" hint="outubro de 2026" value={count(1230, 0.1, 0.9)} on={hl(1)} />
                      <Stat label="Este ano" hint="2026" value={count(9860.45, 0.1, 0.9)} on={hl(1)} />
                      <Stat label="Custo por km" hint="com a km" value={kmShown > 0 ? formatCurrency(0.38 * ease(kmShown)) : '—'} on={hl(4)} big={hl(4) > 0.5} />
                    </div>

                    <div className="grid gap-2.5 lg:grid-cols-[1.45fr_1fr] lg:gap-3">
                      <Panel title="Gasto por mês (últimos 12 meses)" on={hl(2)} className="flex flex-col">
                        <div className="relative min-h-24 flex-1 lg:min-h-40">
                          <div className="flex h-full items-end gap-1.5 lg:gap-2">
                            {MONTHS.map((h, i) => {
                              const a = ease(r(1.1 + i * 0.06, 1.3 + i * 0.06))
                              return <div key={i} className="flex-1 rounded-t" style={{ height: `${Math.max(2, h * a)}%`, background: i === 11 && r(1.9, 2) > 0 ? '#2563eb' : 'var(--series-1)' }} />
                            })}
                          </div>
                          <div
                            className="absolute -top-3 right-0 rounded-lg bg-slate-900 px-2.5 py-1.5 text-white shadow-lg"
                            style={{ opacity: r(1.9, 2), transform: `translateY(${(1 - r(1.9, 2)) * 8}px)` }}
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

                      <div className="space-y-2.5 lg:space-y-3">
                        <Panel title="Gasto por categoria" on={hl(3)}>
                          {CATEGORIES.slice(0, 3).map((c, i) => {
                            const a = ease(r(2.1 + i * 0.1, 2.5 + i * 0.1))
                            return (
                              <div key={c.name} className="mb-1.5 last:mb-0">
                                <div className="mb-1 flex justify-between text-[11px] lg:text-xs">
                                  <span>{c.name}</span>
                                  <span className="font-medium tabular-nums" style={{ opacity: a }}>{formatCurrency(c.total)}</span>
                                </div>
                                <div className="h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                                  <div className="h-full rounded-full" style={{ width: `${c.pct * a * 100}%`, background: 'var(--series-1)' }} />
                                </div>
                              </div>
                            )
                          })}
                        </Panel>
                        <Panel title="Gasto por tipo" on={hl(3)} className="hidden sm:block">
                          <div className="flex h-3 gap-0.5 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                            {TYPES.map((t) => (
                              <div key={t.name} style={{ flex: `${t.pct * ease(r(2.5, 2.9))} 1 0`, background: t.color }} />
                            ))}
                          </div>
                          <ul className="mt-2 space-y-1 text-[11px] lg:text-xs">
                            {TYPES.map((t) => (
                              <li key={t.name} className="flex items-center justify-between" style={{ opacity: r(2.6, 2.95) }}>
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

                    <div className="card hidden items-center justify-between !p-3 lg:flex lg:!p-4" style={ring(hl(4))}>
                      <div>
                        <p className="muted !text-[11px] lg:!text-xs">Custo por km</p>
                        <p className="font-display text-base font-bold text-blue-600 lg:text-xl dark:text-blue-400" style={{ opacity: 0.35 + 0.65 * r(3.2, 3.9) }}>
                          R$ 0,38 por quilômetro rodado
                        </p>
                      </div>
                      <div className="text-right text-[11px] text-slate-500 lg:text-xs">
                        <p>48.200 km</p>
                        <TypeBadge type="maintenance" />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
