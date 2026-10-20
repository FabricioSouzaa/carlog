import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react'
import { formatCurrency, formatDate, todayISO } from '../lib/format'
import { ramp } from '../lib/wheel'
import { TypeBadge } from './ui'
import { useWheel } from './useWheel'

const TITLE = 'Menos de um minuto por gasto.'
const SUBTITLE = 'Lance logo depois de pagar: cada gasto, no lugar certo.'
const DESCRIPTION = 'Troca de óleo e filtro'
const AMOUNT = 'R$ 389,90'
const PLANNED = 'Trocar farol para LED'
const REAL_AMOUNT = 'R$ 380,00'
const STEPS = ['Descreva o gasto', 'Escolha o tipo', 'Anexe a nota', 'Planeje o próximo', 'Marque como realizado']
const SHORT = ['Descreva', 'Tipo', 'Nota', 'Planeje', 'Realize']
const STEP_TEXT = [
  'O que foi, quanto custou e quando.',
  'Manutenção, valorização ou rotina.',
  'Fotos da nota fiscal e da peça.',
  'Registre o que ainda vai gastar.',
  'Um clique e o gasto real é salvo.',
]
/** Quanta rolagem cada trecho entre dois momentos ganha: os de planejar e realizar têm mais coisa acontecendo e ganham mais. */
const WEIGHTS = [1.3, 1.1, 1.1, 1.8, 2]
const LEN = WEIGHTS.reduce((a, b) => a + b, 0)

/**
 * Posições da cena, em itens (0 a 5). Cada número é um momento em que a cena "para":
 * 0 janela vazia · 1 descrição, valor e data · 2 categoria, tipo e km · 3 fotos, salvar e aviso ·
 * 4 planejado criado · 5 cursor clica em "Marcar como realizado" e o gasto é salvo.
 * Entre dois números, cada pedaço se anima por `ramp` (ver `lib/wheel.ts`); nada aparece antes da sua vez.
 */
const SCENE = 6

/** Chegada "de fora da tela": o pedaço vem de além da borda (cima, direita ou baixo) e desacelera ao chegar no card. */
type From = 'up' | 'down' | 'right' | 'downright'
const fly = (r: number, from: From): CSSProperties => {
  const k = Math.pow(1 - r, 3) // 1 longe, 0 no lugar (desacelera no fim)
  const x = from === 'right' || from === 'downright' ? k * 60 : 0 // vw
  const y = from === 'up' ? -k * 70 : from === 'down' || from === 'downright' ? k * 60 : 0 // vh
  return { opacity: Math.min(1, r * 2.4), transform: `translate(${x}vw, ${y}vh)` }
}
/** Entrada de um pedaço pequeno da cena: sobe um pouco e aparece. */
const show = (r: number, px = 10): CSSProperties => ({ opacity: r, transform: `translateY(${(1 - r) * px}px)` })
/** Quantos caracteres de `text` já foram "digitados" com o progresso `r` (0 a 1). */
const typedOf = (text: string, r: number) => text.slice(0, Math.round(r * text.length))

function Field({ label, focus = false, style, children }: { label: string; focus?: boolean; style?: CSSProperties; children?: ReactNode }) {
  return (
    <div style={style}>
      <div className="mb-1.5 text-[13px] font-medium text-slate-600 dark:text-slate-300">{label}</div>
      <div
        className={`flex h-11 items-center rounded-[10px] border bg-white px-3.5 text-[15px] dark:bg-slate-900 ${focus ? 'border-blue-500 ring-4 ring-blue-500/20' : 'border-slate-300 dark:border-slate-700'}`}
      >
        {children}
      </div>
    </div>
  )
}

const Caret = () => <span className="caret ml-0.5 h-5 w-0.5 shrink-0 bg-blue-600" />

/** Ponteiro do mouse, para deixar claro que alguém clicou. */
function Cursor({ style }: { style: CSSProperties }) {
  return (
    <svg aria-hidden="true" width="28" height="28" viewBox="0 0 24 24" className="pointer-events-none absolute z-10 drop-shadow-md" style={style}>
      <path d="M5 3l14 8-6 2 4 7-3 1-4-7-5 4z" fill="#0f172a" stroke="#fff" strokeWidth="1.6" strokeLinejoin="round" />
    </svg>
  )
}

/**
 * Seção "Menos de um minuto por gasto": a janela "Novo gasto" começa vazia e fixa na tela; conforme você rola, os campos
 * entram um a um e se preenchem sozinhos (descrição digitada devagar, valor, tipo, fotos, salvar). Depois a cena troca: um gasto
 * planejado é criado e, com um clique, vira gasto real. Mesma conta de rolagem do seletor da seção 2 (`useWheel`), só que mais lenta.
 * Sem movimento, mostra a cena pronta.
 */
export function FeatureDemo() {
  const [pos, setPos] = useState(0)
  // a cena só precisa de ~1 mudança por centésimo; evita renderizar a cada pixel de rolagem
  const { ref, goTo } = useWheel(SCENE, { tau: 110, dwell: 0.2, weights: WEIGHTS, staticPosition: 3, onPosition: (p) => setPos(Math.round(p * 100) / 100) })
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
  const today = formatDate(todayISO())

  // cena 1: Novo gasto
  const formOut = r(3.05, 3.4)
  const typedDesc = typedOf(DESCRIPTION, r(0.2, 0.85))
  const typedAmount = typedOf(AMOUNT, r(0.78, 0.95))
  const pressSave = r(2.65, 2.78)
  // cena 2: Planejados
  const plannedIn = r(3.1, 3.45)
  const createOut = r(3.93, 4.0) // o formulário de criar some...
  const cardIn = r(4.0, 4.1) // ...e só depois o card aparece no lugar
  const moveCursor = r(4.1, 4.45)
  const clickReal = r(4.45, 4.55)
  const typedReal = typedOf(REAL_AMOUNT, r(4.7, 4.88))
  const pressReal = r(4.9, 4.96)

  return (
    <section ref={ref} id="cadastrar" aria-labelledby="cadastrar-titulo" className="wheel-section demo-section demo-bg relative" style={{ '--p': 0, '--n': SCENE, '--len': LEN } as CSSProperties}>
      <div className="wheel-stage flex items-center">
        <div className="mx-auto grid w-full max-w-6xl items-center gap-4 px-4 lg:grid-cols-[380px_1fr] lg:gap-16">
          <div>
            <p className="text-[13px] font-semibold tracking-[0.18em] text-blue-300 uppercase">Como funciona</p>
            <h2 id="cadastrar-titulo" className="font-display mt-1.5 text-[28px] leading-[1.1] font-bold tracking-tight text-white lg:mt-2 lg:text-5xl">{TITLE}</h2>
            <p className="mt-3 hidden text-base text-slate-300 sm:block lg:text-[17px]">{SUBTITLE}</p>

            {/* o passo em foco: número, nome e uma frase; cada um aparece quando chega a sua vez */}
            <div className="relative mt-3 h-[72px] lg:mt-9 lg:h-28" aria-live="off">
              {STEPS.map((label, i) => {
                const d = pos - (i + 1)
                return (
                  <div key={label} className="absolute inset-x-0 top-0" style={{ opacity: Math.max(0, 1 - Math.abs(d) * 1.7), transform: `translateY(${-d * 22}px)` }}>
                    <p className="font-display text-sm font-bold text-blue-300">0{i + 1} / 05</p>
                    <p className="font-display mt-0.5 text-xl font-bold text-white lg:mt-1 lg:text-[28px]">{label}</p>
                    <p className="mt-0.5 text-sm text-slate-300 lg:mt-1 lg:text-[15px]">{STEP_TEXT[i]}</p>
                  </div>
                )
              })}
            </div>
          </div>

          <div className="mx-auto w-full max-w-[680px]">
            {/* a trilha: os 5 passos lado a lado; o rastro azul cresce com a rolagem */}
            <ol className="demo-track relative mb-3 justify-between lg:mb-7" aria-label="Passos">
              <span aria-hidden="true" className="absolute top-3.5 right-3.5 left-3.5 h-0.5 rounded-full bg-white/15" />
              <span
                aria-hidden="true"
                className="absolute top-3.5 left-3.5 h-0.5 rounded-full bg-linear-to-r from-blue-600 to-blue-300"
                style={{ width: `calc((100% - 28px) * ${r(1, 5)})` }}
              />
              {r(1, 5) > 0 && r(1, 5) < 1 && (
                <span
                  aria-hidden="true"
                  className="absolute top-[9px] size-3 -translate-x-1/2 rounded-full bg-blue-200 shadow-[0_0_14px_4px_rgb(96_165_250_/_0.9)]"
                  style={{ left: `calc(14px + (100% - 28px) * ${r(1, 5)})` }}
                />
              )}
              {STEPS.map((label, i) => {
                const done = i < step || (i === step && pos >= i + 1.95)
                const now = i === step
                return (
                  <li key={label} className="relative z-10 flex w-14 flex-col items-center">
                    <button
                      type="button"
                      onClick={() => goTo(i + 1)}
                      aria-label={label}
                      aria-current={now ? 'step' : undefined}
                      className={`flex size-7 items-center justify-center rounded-full border text-xs font-bold transition-all ${now ? 'scale-125 border-blue-300 bg-blue-500 text-white shadow-[0_0_0_5px_rgb(59_130_246_/_0.28)]' : done ? 'border-blue-500 bg-blue-600 text-white' : 'border-white/25 bg-slate-900/70 text-slate-400 hover:text-slate-200'}`}
                    >
                      {done ? '✓' : i + 1}
                    </button>
                    <span className={`mt-2.5 hidden text-center text-xs font-medium sm:block ${now ? 'text-white' : 'text-slate-500'}`}>{SHORT[i]}</span>
                  </li>
                )
              })}
            </ol>

          <div ref={fit} className="relative w-full" style={{ height: `calc(var(--demo-h, 0px) * ${scale})` }}>
            <div className="demo-glow" aria-hidden="true" />
            {/* a janela ocupa a largura disponível (até 680 px); só encolhe se a tela for baixa demais */}
            <div ref={win} className="demo-window absolute top-0 left-0 origin-top-left" style={{ width: `${100 / scale}%`, transform: `scale(${scale})` }}>
              <div className="relative w-full" style={{ height: 'var(--demo-h)' }}>
                {/* cena 1: janela "Novo gasto" — começa vazia */}
                <div
                  className="demo-card absolute inset-0 flex flex-col"
                  style={{ opacity: 1 - formOut, transform: `translateY(${-formOut * 28}px) scale(${1 - formOut * 0.04})`, pointerEvents: 'none' }}
                  aria-hidden="true"
                >
                  <div className="flex h-14 items-center justify-between border-b border-slate-200 px-5 lg:h-[68px] lg:px-7 dark:border-slate-800">
                    <span className="font-display text-xl font-bold lg:text-[22px]">Novo gasto</span>
                    <span className="text-slate-400">✕</span>
                  </div>
                  <div className="flex-1 space-y-3.5 px-5 pt-4 lg:space-y-[18px] lg:px-7 lg:pt-5">
                    <Field label="Descrição" focus={r(0.2, 0.22) > 0 && pos < 1.1} style={fly(r(0.04, 0.2), 'up')}>
                      <span>{typedDesc}</span>
                      {r(0.2, 0.22) > 0 && pos < 1.15 && <Caret />}
                    </Field>
                    <div className="grid grid-cols-2 gap-3 lg:gap-4">
                      <Field label="Valor" focus={r(0.78, 0.8) > 0 && pos < 0.97} style={fly(r(0.66, 0.8), 'right')}>
                        <span>{typedAmount}</span>
                        {r(0.78, 0.8) > 0 && pos < 0.97 && <Caret />}
                      </Field>
                      <Field label="Data" style={fly(r(0.84, 0.98), 'downright')}>
                        {today}
                      </Field>
                    </div>
                    <Field label="Categoria" style={fly(r(1, 1.22), 'right')}>
                      <span style={show(r(1.1, 1.3), 6)}>Manutenção</span>
                      <span className="ml-auto text-slate-400">⌄</span>
                    </Field>
                    <div style={fly(r(1.28, 1.46), 'down')}>
                      <div className="mb-1.5 text-[13px] font-medium text-slate-600 dark:text-slate-300">Tipo</div>
                      <div className="flex gap-2 text-sm font-medium">
                        {['Manutenção', 'Valorização', 'Rotina'].map((t, i) => {
                          const on = i === 0 && r(1.5, 1.65) > 0.5
                          return (
                            <span key={t} className={`rounded-full px-3.5 py-1.5 transition-colors ${on ? 'bg-blue-100 text-blue-700 ring-[1.5px] ring-blue-500 dark:bg-blue-950 dark:text-blue-300' : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300'}`}>{t}</span>
                          )
                        })}
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3 lg:gap-4">
                      <Field label="Km (opcional)" style={fly(r(1.62, 1.8), 'right')}>
                        <span style={show(r(1.75, 1.95), 6)}>48.200 km</span>
                      </Field>
                      <div style={fly(r(1.98, 2.16), 'down')}>
                        <div className="mb-1.5 text-[13px] font-medium text-slate-600 dark:text-slate-300">Fotos (até 5)</div>
                        <div className="flex gap-1.5 lg:gap-2">
                          {[0, 1].map((i) => {
                            const a = r(2.15 + i * 0.15, 2.4 + i * 0.15)
                            return a > 0 ? (
                              <span key={i} className={`h-11 w-11 rounded-[10px] bg-linear-to-br lg:h-16 lg:w-16 ${i === 0 ? 'from-blue-700 to-blue-500' : 'from-slate-900 to-blue-700'}`} style={{ opacity: a, transform: `scale(${0.7 + a * 0.3})` }} />
                            ) : null
                          })}
                          <span className="flex h-11 w-11 items-center justify-center rounded-[10px] border border-dashed border-slate-300 text-2xl text-slate-400 lg:h-16 lg:w-16 dark:border-slate-600">+</span>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="px-5 pb-5 lg:px-7 lg:pb-7" style={fly(r(2.48, 2.64), 'down')}>
                    <div
                      className="flex h-[50px] items-center justify-center rounded-xl bg-blue-600 text-base font-semibold text-white"
                      style={{ boxShadow: `0 0 0 ${pressSave * 4}px rgb(59 130 246 / ${pressSave * 0.35})`, transform: `scale(${1 - pressSave * 0.015})` }}
                    >
                      Salvar gasto
                    </div>
                  </div>
                  <div className="demo-toast" style={{ ...show(r(2.8, 2.95), 14), top: -22, right: 24 }}>
                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-green-600 text-[13px] font-bold text-white">✓</span>
                    Gasto salvo
                  </div>
                </div>

                {/* cena 2: Planejados — cria um planejado e o marca como realizado */}
                <div
                  className="demo-card absolute inset-0 flex flex-col"
                  style={{ opacity: plannedIn, transform: `translateY(${(1 - plannedIn) * 28}px) scale(${0.96 + plannedIn * 0.04})`, pointerEvents: 'none' }}
                  aria-hidden="true"
                >
                  <div className="flex h-14 items-center border-b border-slate-200 px-5 lg:h-[68px] lg:px-7 dark:border-slate-800">
                    <span className="font-display text-xl font-bold lg:text-[22px]">Planejados</span>
                  </div>
                  <div className="relative flex-1 px-5 pt-4 lg:px-7 lg:pt-5">
                    {/* a) formulário de novo planejado */}
                    <div className="absolute inset-x-5 top-4 space-y-3.5 lg:inset-x-7 lg:top-5 lg:space-y-[18px]" style={{ opacity: 1 - createOut, transform: `translateY(${-createOut * 10}px)` }}>
                      <p className="text-sm font-semibold text-slate-500" style={show(r(3.3, 3.42))}>Novo planejado</p>
                      <Field label="Descrição" focus={r(3.4, 3.42) > 0 && pos < 3.7} style={fly(r(3.3, 3.46), 'up')}>
                        <span>{typedOf(PLANNED, r(3.46, 3.7))}</span>
                        {r(3.42, 3.44) > 0 && pos < 3.72 && <Caret />}
                      </Field>
                      <div className="grid grid-cols-2 gap-3 lg:gap-4">
                        <Field label="Valor estimado" style={fly(r(3.6, 3.74), 'right')}>
                          <span style={show(r(3.66, 3.76), 6)}>R$ 400,00</span>
                        </Field>
                        <div style={fly(r(3.66, 3.8), 'downright')}>
                          <div className="mb-1.5 text-[13px] font-medium text-slate-600 dark:text-slate-300">Prioridade</div>
                          <div className="flex gap-2 text-sm font-medium">
                            {['Baixa', 'Média', 'Alta'].map((t, i) => {
                              const on = i === 2 && r(3.74, 3.8) > 0.5
                              return (
                                <span key={t} className={`rounded-full px-3 py-1.5 ${on ? 'bg-red-100 text-red-800 ring-[1.5px] ring-red-400 dark:bg-red-950 dark:text-red-300' : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300'}`}>{t}</span>
                              )
                            })}
                          </div>
                        </div>
                      </div>
                      <div style={fly(r(3.76, 3.86), 'down')}>
                        <div
                          className="flex h-11 items-center justify-center rounded-xl bg-blue-600 text-[15px] font-semibold text-white"
                          style={{ boxShadow: `0 0 0 ${r(3.84, 3.9) * 4}px rgb(59 130 246 / ${r(3.84, 3.9) * 0.35})`, transform: `scale(${1 - r(3.84, 3.9) * 0.015})` }}
                        >
                          Adicionar planejado
                        </div>
                      </div>
                    </div>

                    {/* b) o card do planejado, com o botão que o cursor vai clicar */}
                    <div className="card !p-4 lg:!p-5" style={fly(cardIn, 'right')}>
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <h3 className="text-base font-semibold lg:text-lg">{PLANNED}</h3>
                          <p className="muted">Peças</p>
                        </div>
                        <p className="text-base font-bold tabular-nums lg:text-lg">{formatCurrency(400)}</p>
                      </div>
                      <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <TypeBadge type="upgrade" />
                          <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-800 dark:bg-red-950 dark:text-red-300">Prioridade alta</span>
                        </div>
                        <span className="relative">
                          {pressReal >= 1 ? (
                            <span className="inline-flex items-center gap-1.5 rounded-lg bg-green-100 px-3 py-2 text-[13px] font-semibold text-green-800 dark:bg-green-950 dark:text-green-300">✓ Realizado</span>
                          ) : (
                            <span
                              className="btn-primary !px-3 !py-2 !text-[13px] lg:!px-4 lg:!py-2.5 lg:!text-sm"
                              style={{ boxShadow: `0 0 0 ${clickReal * 4}px rgb(59 130 246 / ${clickReal * 0.35})`, transform: `scale(${1 - clickReal * 0.03})` }}
                            >
                              Marcar como realizado
                            </span>
                          )}
                          <Cursor
                            style={{
                              left: '58%',
                              top: '48%',
                              opacity: r(4.08, 4.14) * (1 - r(4.62, 4.74)),
                              transform: `translate(${Math.pow(1 - moveCursor, 2) * 62}vw, ${Math.pow(1 - moveCursor, 2) * 58}vh) scale(${1 - clickReal * 0.12})`,
                            }}
                          />
                        </span>
                      </div>
                    </div>

                    {/* c) o formulário já vem preenchido; falta o valor real */}
                    <div className="mt-4 space-y-3.5 lg:mt-5 lg:space-y-[18px]" style={fly(r(4.55, 4.72), 'down')}>
                      <p className="text-sm font-medium text-blue-600 dark:text-blue-400">↓ O formulário já vem preenchido</p>
                      <Field label="Descrição">{PLANNED}</Field>
                      <div className="grid grid-cols-2 gap-3 lg:gap-4">
                        <Field label="Valor real" focus={r(4.68, 4.7) > 0 && pos < 4.92}>
                          <span>{typedReal}</span>
                          {r(4.68, 4.7) > 0 && pos < 4.92 && <Caret />}
                        </Field>
                        <Field label="Data">{today}</Field>
                      </div>
                    </div>
                  </div>
                  <div className="px-5 pb-5 lg:px-7 lg:pb-7" style={fly(r(4.58, 4.74), 'down')}>
                    <div
                      className="flex h-[50px] items-center justify-center rounded-xl bg-blue-600 text-base font-semibold text-white"
                      style={{ boxShadow: `0 0 0 ${pressReal * 4}px rgb(59 130 246 / ${pressReal * 0.35})`, transform: `scale(${1 - pressReal * 0.015})` }}
                    >
                      Salvar gasto
                    </div>
                  </div>
                  <div className="demo-toast" style={{ ...show(r(4.94, 5), 14), top: -22, right: 24 }}>
                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-green-600 text-[13px] font-bold text-white">✓</span>
                    Gasto salvo
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
