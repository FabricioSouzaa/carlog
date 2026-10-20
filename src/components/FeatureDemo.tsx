import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react'
import { formatCurrency, formatDate, todayISO } from '../lib/format'
import { ramp } from '../lib/wheel'
import { TypeBadge } from './ui'
import { useWheel } from './useWheel'

const TITLE = 'Menos de um minuto por gasto.'
const SUBTITLE = 'Lance logo depois de pagar: cada gasto, no lugar certo.'
const DESCRIPTION = 'Troca de óleo e filtro'
const STEPS = ['Descreva o gasto', 'Escolha o tipo', 'Anexe a nota', 'Ou marque um planejado']

/**
 * Posições da cena, em itens (0 a 4). Cada número é um momento em que a cena "para":
 * 0 formulário vazio · 1 descrição, valor e data · 2 categoria, tipo e km · 3 fotos, salvar e aviso · 4 planejado virando gasto.
 * Entre dois números, cada pedaço se anima por `ramp` (ver `lib/wheel.ts`).
 */
const SCENE = 5

const lift = (r: number, px = 10): CSSProperties => ({ opacity: r, transform: `translateY(${(1 - r) * px}px)` })

function Field({ label, focus = false, className = '', children }: { label: string; focus?: boolean; className?: string; children?: ReactNode }) {
  return (
    <div className={className}>
      <div className="mb-1.5 text-[13px] font-medium text-slate-600 dark:text-slate-300">{label}</div>
      <div
        className={`flex h-11 items-center rounded-[10px] border bg-white px-3.5 text-[15px] dark:bg-slate-900 ${focus ? 'border-blue-500 ring-4 ring-blue-500/20' : 'border-slate-300 dark:border-slate-700'}`}
      >
        {children}
      </div>
    </div>
  )
}

const Placeholder = ({ children }: { children: ReactNode }) => <span className="text-slate-400">{children}</span>

/**
 * Seção "Menos de um minuto por gasto": um formulário "Novo gasto" fica fixo na tela e, conforme você rola, se preenche
 * sozinho (descrição digitada, valor, tipo, fotos, salvar) e, no fim, mostra um gasto planejado virando gasto real.
 * Usa a mesma conta de rolagem do seletor da seção 2 (`useWheel`), só que mais lenta. Sem movimento, mostra a cena pronta.
 */
export function FeatureDemo() {
  const [pos, setPos] = useState(0)
  // a cena só precisa de ~1 mudança por centésimo; evita renderizar a cada pixel de rolagem
  const { ref, goTo } = useWheel(SCENE, { tau: 110, dwell: 0.2, staticPosition: 3, onPosition: (p) => setPos(Math.round(p * 100) / 100) })
  const step = Math.max(0, Math.min(STEPS.length - 1, Math.round(pos) - 1))

  const fit = useRef<HTMLDivElement>(null)
  const win = useRef<HTMLDivElement>(null)
  const [scale, setScale] = useState(1)
  // em telas baixas a janela encolhe para caber embaixo do título, sem cortar o botão de salvar
  useEffect(() => {
    const measure = () => {
      const box = fit.current
      const inner = win.current
      const stage = ref.current?.firstElementChild as HTMLElement | null
      if (!box || !inner || !stage || getComputedStyle(stage).position !== 'sticky') return setScale(1)
      const free = stage.clientHeight - (box.getBoundingClientRect().top - stage.getBoundingClientRect().top) - 20
      setScale(Math.max(0.6, Math.min(1, free / inner.offsetHeight)))
    }
    measure()
    window.addEventListener('resize', measure)
    return () => window.removeEventListener('resize', measure)
  }, [ref])

  const r = (from: number, to: number) => ramp(pos, from, to)
  const typed = Math.round(r(0.05, 0.7) * DESCRIPTION.length)
  const formOut = r(3.05, 3.5)
  const plannedIn = r(3.1, 3.55)
  const press = r(2.45, 2.62)
  const today = formatDate(todayISO())

  return (
    <section ref={ref} id="cadastrar" aria-labelledby="cadastrar-titulo" className="wheel-section demo-section demo-bg relative" style={{ '--p': 0, '--n': SCENE } as CSSProperties}>
      <div className="wheel-stage flex items-center">
        <div className="mx-auto grid w-full max-w-6xl items-center gap-4 px-4 lg:grid-cols-[380px_1fr] lg:gap-16">
          <div>
            <p className="text-[13px] font-semibold tracking-[0.18em] text-blue-600 uppercase dark:text-blue-400">Como funciona</p>
            <h2 id="cadastrar-titulo" className="font-display mt-2 text-4xl leading-[1.08] font-bold tracking-tight lg:text-5xl">{TITLE}</h2>
            <p className="muted mt-3 !text-base lg:!text-[17px]">{SUBTITLE}</p>

            <ol className="wheel-nav mt-8 space-y-1 max-lg:sr-only max-lg:focus-within:not-sr-only">
              {STEPS.map((label, i) => (
                <li key={label}>
                  <button
                    type="button"
                    onClick={() => goTo(i + 1)}
                    className={`flex items-center gap-3 rounded-lg py-2 pr-3 text-left text-[17px] transition-colors ${i === step ? 'font-semibold text-slate-900 dark:text-white' : 'text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-300'}`}
                  >
                    <span className={`h-2 w-2 rounded-full transition-colors ${i <= step ? 'bg-blue-600' : 'bg-slate-300 dark:bg-slate-700'}`} />
                    <span className={`font-display text-[13px] font-bold ${i <= step ? 'text-blue-600 dark:text-blue-400' : ''}`}>0{i + 1}</span>
                    {label}
                  </button>
                </li>
              ))}
            </ol>
            {/* no celular, a lista vira uma barra de 4 passos */}
            <div aria-hidden="true" className="mt-4 flex gap-1.5 lg:hidden">
              {STEPS.map((label, i) => (
                <span key={label} className={`h-1 flex-1 rounded-full transition-colors ${i <= step ? 'bg-blue-600' : 'bg-slate-200 dark:bg-slate-700'}`} />
              ))}
            </div>
            <p aria-hidden="true" className="font-display mt-2 text-[15px] font-bold text-blue-600 lg:hidden dark:text-blue-400">0{step + 1}  {STEPS[step]}</p>
          </div>

          <div ref={fit} className="relative mx-auto w-full max-w-[680px]" style={{ height: `calc(var(--demo-h, 0px) * ${scale})` }}>
            <div className="demo-glow" aria-hidden="true" />
            {/* a janela ocupa a largura disponível (até 680 px); só encolhe se a tela for baixa demais */}
            <div ref={win} className="demo-window absolute top-0 left-0 origin-top-left" style={{ width: `${100 / scale}%`, transform: `scale(${scale})` }}>
              <div className="relative w-full" style={{ height: 'var(--demo-h)' }}>
                {/* cena 1: formulário "Novo gasto" */}
                <div
                  className="demo-card absolute inset-0 flex flex-col"
                  style={{ opacity: 1 - formOut, transform: `translateY(${-formOut * 28}px) scale(${1 - formOut * 0.04})`, pointerEvents: 'none' }}
                  aria-hidden="true"
                >
                  <div className="flex h-14 items-center justify-between lg:h-[68px] border-b border-slate-200 px-5 lg:px-7 dark:border-slate-800">
                    <span className="font-display text-xl font-bold lg:text-[22px]">Novo gasto</span>
                    <span className="text-slate-400">✕</span>
                  </div>
                  <div className="flex-1 space-y-3.5 px-5 pt-4 lg:space-y-[18px] lg:px-7 lg:pt-5">
                    <Field label="Descrição" focus={pos > 0.02 && pos < 1.1}>
                      <span>{DESCRIPTION.slice(0, typed)}</span>
                      {pos > 0.02 && pos < 1.15 && <span className="caret ml-0.5 h-5 w-0.5 bg-blue-600" />}
                      {typed === 0 && pos <= 0.02 && <Placeholder>O que você pagou?</Placeholder>}
                    </Field>
                    <div className="grid grid-cols-2 gap-3 lg:gap-4">
                      <Field label="Valor">
                        {r(0.6, 0.85) > 0 ? <span style={lift(r(0.6, 0.85), 6)}>{formatCurrency(389.9)}</span> : <Placeholder>R$ 0,00</Placeholder>}
                      </Field>
                      <Field label="Data">
                        {r(0.75, 1) > 0 ? <span style={lift(r(0.75, 1), 6)}>{today}</span> : <Placeholder>dd/mm/aaaa</Placeholder>}
                      </Field>
                    </div>
                    <Field label="Categoria">
                      {r(1, 1.35) > 0 ? <span style={lift(r(1, 1.35), 6)}>Manutenção</span> : <Placeholder>Escolha uma categoria</Placeholder>}
                      <span className="ml-auto text-slate-400">⌄</span>
                    </Field>
                    <div>
                      <div className="mb-1.5 text-[13px] font-medium text-slate-600 dark:text-slate-300">Tipo</div>
                      <div className="flex gap-2 text-sm font-medium">
                        {['Manutenção', 'Valorização', 'Rotina'].map((t, i) => {
                          const on = i === 0 && r(1.3, 1.6) > 0.5
                          return (
                            <span key={t} className={`rounded-full px-3.5 py-1.5 transition-colors ${on ? 'bg-blue-100 text-blue-700 ring-[1.5px] ring-blue-500 dark:bg-blue-950 dark:text-blue-300' : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300'}`}>{t}</span>
                          )
                        })}
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3 lg:gap-4">
                      <Field label="Km (opcional)">
                        {r(1.5, 1.9) > 0 ? <span style={lift(r(1.5, 1.9), 6)}>48.200 km</span> : <Placeholder>0 km</Placeholder>}
                      </Field>
                      <div>
                        <div className="mb-1.5 text-[13px] font-medium text-slate-600 dark:text-slate-300">Fotos (até 5)</div>
                        <div className="flex gap-1.5 lg:gap-2">
                          {[0, 1].map((i) => {
                            const a = r(2 + i * 0.22, 2.3 + i * 0.22)
                            return a > 0 ? (
                              <span key={i} className={`h-11 w-11 rounded-[10px] bg-linear-to-br lg:h-16 lg:w-16 ${i === 0 ? 'from-blue-700 to-blue-500' : 'from-slate-900 to-blue-700'}`} style={{ opacity: a, transform: `scale(${0.7 + a * 0.3})` }} />
                            ) : null
                          })}
                          <span className="flex h-11 w-11 items-center justify-center rounded-[10px] border border-dashed lg:h-16 lg:w-16 border-slate-300 text-2xl text-slate-400 dark:border-slate-600">+</span>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="px-5 pb-5 lg:px-7 lg:pb-7">
                    <div
                      className="flex h-[50px] items-center justify-center rounded-xl bg-blue-600 text-base font-semibold text-white"
                      style={{ boxShadow: `0 0 0 ${press * 4}px rgb(59 130 246 / ${press * 0.35})`, transform: `scale(${1 - press * 0.015})` }}
                    >
                      Salvar gasto
                    </div>
                  </div>
                  <div className="demo-toast" style={{ ...lift(r(2.6, 2.85), 14), top: -22, right: 24 }}>
                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-green-600 text-[13px] font-bold text-white">✓</span>
                    Gasto salvo
                  </div>
                </div>

                {/* cena 2: gasto planejado vira gasto real */}
                <div
                  className="demo-card absolute inset-0 flex flex-col"
                  style={{ opacity: plannedIn, transform: `translateY(${(1 - plannedIn) * 28}px) scale(${0.96 + plannedIn * 0.04})`, pointerEvents: 'none' }}
                  aria-hidden="true"
                >
                  <div className="flex h-14 items-center border-b border-slate-200 px-5 lg:h-[68px] lg:px-7 dark:border-slate-800">
                    <span className="font-display text-xl font-bold lg:text-[22px]">Planejados</span>
                  </div>
                  <div className="flex-1 space-y-3.5 px-5 pt-4 lg:space-y-[18px] lg:px-7 lg:pt-6">
                    <div className="card !p-5">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <h3 className="text-base font-semibold lg:text-lg">Trocar farol para LED</h3>
                          <p className="muted">Peças</p>
                        </div>
                        <p className="text-lg font-bold tabular-nums">{formatCurrency(400)}</p>
                      </div>
                      <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <TypeBadge type="upgrade" />
                          <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-800 dark:bg-red-950 dark:text-red-300">Prioridade alta</span>
                        </div>
                        <span
                          className="btn-primary !px-3 !py-2 !text-[13px] lg:!px-4 lg:!py-2.5 lg:!text-sm"
                          style={{ boxShadow: `0 0 0 ${r(3.6, 3.8) * 4}px rgb(59 130 246 / ${r(3.6, 3.8) * 0.35})`, transform: `scale(${1 - r(3.6, 3.8) * 0.02})` }}
                        >
                          Marcar como realizado
                        </span>
                      </div>
                    </div>
                    <div style={lift(r(3.75, 3.9), 8)}>
                      <p className="mb-3 text-sm font-medium text-blue-600 dark:text-blue-400">↓ O formulário já vem preenchido</p>
                      <div className="space-y-[18px]">
                        <Field label="Descrição">Trocar farol para LED</Field>
                        <div className="grid grid-cols-2 gap-3 lg:gap-4">
                          <Field label="Valor real" focus={r(3.85, 4) > 0.5}>
                            <Placeholder>R$ 0,00</Placeholder>
                            {r(3.85, 4) > 0.5 && <span className="caret ml-0.5 h-5 w-0.5 bg-blue-600" />}
                          </Field>
                          <Field label="Data">{today}</Field>
                        </div>
                        <p className="text-[13px] font-medium text-blue-600 dark:text-blue-400">Informe o valor real e a data</p>
                      </div>
                    </div>
                  </div>
                  <div className="px-5 pb-5 lg:px-7 lg:pb-7">
                    <div className="flex h-[50px] items-center justify-center rounded-xl bg-blue-600 text-base font-semibold text-white">Salvar gasto</div>
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
