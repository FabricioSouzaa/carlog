import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react'
import { formatCurrency, formatDate, todayISO } from '../lib/format'
import { ACCESS_MESSAGE, ACCESS_WHATSAPP } from '../config'
import { ramp } from '../lib/wheel'
import { whatsappLink } from '../lib/whatsapp'
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
const WEIGHTS = [1.3, 1.1, 1.1, 1.8, 2, 1.3] // o último trecho é a pausa final, em que entra o convite para usar
const LEN = WEIGHTS.reduce((a, b) => a + b, 0)

/**
 * Posições da cena, em itens (0 a 5). Cada número é um momento em que a cena "para":
 * 0 janela vazia · 1 descrição, valor e data · 2 categoria, tipo e km · 3 fotos, salvar e aviso ·
 * 4 planejado criado · 5 cursor clica em "Marcar como realizado" e o gasto é salvo.
 * Entre dois números, cada pedaço se anima por `ramp` (ver `lib/wheel.ts`); nada aparece antes da sua vez.
 */
const SCENE = 6 // momentos 0 a 5; a pausa final (5 a 6) só mostra o convite

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
export function FeatureDemo({ onLogin }: { onLogin: () => void }) {
  const [pos, setPos] = useState(0)
  // a cena só precisa de ~1 mudança por centésimo; evita renderizar a cada pixel de rolagem
  const { ref, goTo } = useWheel(SCENE, { tau: 200, dwell: 0.2, weights: WEIGHTS, staticPosition: 3, onPosition: (p) => setPos(Math.round(p * 100) / 100) })
  // -1 antes de a demonstração começar: nenhum passo marcado ainda
  const step = pos < 0.06 ? -1 : Math.max(0, Math.min(STEPS.length - 1, Math.round(pos) - 1))

  const fit = useRef<HTMLDivElement>(null)
  const win = useRef<HTMLDivElement>(null)
  const track = useRef<HTMLOListElement>(null)
  const [scale, setScale] = useState(1)
  // em telas baixas a janela encolhe para o conjunto (trilha + janela) caber inteiro na tela, sem cortar nada
  useEffect(() => {
    const measure = () => {
      const inner = win.current
      const stage = ref.current?.firstElementChild as HTMLElement | null
      if (!inner || !stage || getComputedStyle(stage).position !== 'sticky') return setScale(1)
      const trackH = track.current ? track.current.offsetHeight + parseFloat(getComputedStyle(track.current).marginBottom) : 0
      const free = stage.clientHeight - trackH - 56 // 28 px de folga em cima e embaixo (a área fixa tem sempre a altura da tela)
      setScale(Math.max(0.5, Math.min(1, free / inner.offsetHeight)))
    }
    measure()
    window.addEventListener('resize', measure)
    // fontes que chegam depois, quebras de linha e giro da tela mudam as alturas sem disparar 'resize'
    const observer = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(measure)
    const stage = ref.current?.firstElementChild
    if (stage) observer?.observe(stage)
    if (track.current) observer?.observe(track.current)
    return () => {
      window.removeEventListener('resize', measure)
      observer?.disconnect()
    }
  }, [ref])

  const r = (from: number, to: number) => ramp(pos, from, to)
  const today = formatDate(todayISO())
  // fechamento: depois do passo 5 a cena se afasta e entra o convite em tela cheia
  const closing = r(5.25, 5.65)
  const invite = r(5.45, 5.85)

  // cena 1: Novo gasto
  const formOut = r(3.05, 3.4)
  const typedDesc = typedOf(DESCRIPTION, r(0.26, 0.7))
  const typedAmount = typedOf(AMOUNT, r(0.74, 0.88))
  const pressSave = r(2.76, 2.86)
  // cena 2: Planejados
  const plannedIn = r(3.1, 3.45)
  const createOut = r(4, 4.08) // o formulário de criar some...
  const cardIn = r(4.06, 4.2) // ...e só depois o card aparece no lugar
  const moveCursor = r(4.26, 4.5)
  const clickReal = r(4.5, 4.58)
  const typedReal = typedOf(REAL_AMOUNT, r(4.78, 4.9))
  const pressReal = r(4.9, 4.95)

  return (
    <section ref={ref} id="cadastrar" aria-labelledby="cadastrar-titulo" className="wheel-section demo-section demo-bg relative" style={{ '--p': 0, '--n': SCENE, '--len': LEN } as CSSProperties}>
      <div className="wheel-stage flex items-center">
        <div
          className="mx-auto grid w-full max-w-6xl items-center gap-4 px-4 lg:grid-cols-[380px_1fr] lg:gap-16"
          style={{ opacity: 1 - closing, transform: `scale(${1 - closing * 0.06})`, pointerEvents: closing > 0.02 ? 'none' : undefined }}
        >
          <div>
            <p className="text-[13px] font-semibold tracking-[0.18em] text-blue-300 uppercase">Como funciona</p>
            <h2 id="cadastrar-titulo" className="font-display mt-1.5 text-[28px] leading-[1.1] font-bold tracking-tight text-white lg:mt-2 lg:text-5xl">{TITLE}</h2>
            <p className="mt-3 hidden text-base text-slate-300 sm:block lg:text-[17px]">{SUBTITLE}</p>

            {/* o passo em foco: número, nome e uma frase; cada um aparece quando chega a sua vez */}
            <div className="relative mt-3 h-[72px] lg:mt-9 lg:h-28">
              {STEPS.map((label, i) => {
                const d = pos - (i + 1)
                return (
                  <div key={label} className="demo-legend absolute inset-x-0 top-0" style={{ opacity: Math.max(0, 1 - Math.abs(d) * 1.7), transform: `translateY(${-d * 22}px)` }}>
                    <p className="font-display text-sm font-bold text-blue-300">0{i + 1} / 05</p>
                    <p className="font-display mt-0.5 text-xl font-bold text-white lg:mt-1 lg:text-[28px]">{label}</p>
                    <p className="mt-0.5 text-sm text-slate-300 lg:mt-1 lg:text-[15px]">{STEP_TEXT[i]}</p>
                  </div>
                )
              })}
              <div aria-hidden="true" className="demo-hint absolute inset-x-0 top-0" style={{ '--hint': 1 - r(0.02, 0.22) } as CSSProperties}>
                <span>Role para ver</span>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className="demo-hint-arrow">
                  <path d="M6 9l6 6 6-6" />
                </svg>
              </div>
              <div className="demo-cta absolute inset-x-0 top-0" data-on={r(5.35, 5.8) > 0.05} style={{ '--cta': r(5.35, 5.8) } as CSSProperties}>
                <p className="text-sm text-slate-300 lg:text-[15px]">Pronto para testar?</p>
                <a
                  href={whatsappLink(ACCESS_WHATSAPP, ACCESS_MESSAGE)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn mt-2 !bg-white !px-5 !py-3 !text-[15px] !font-semibold !text-slate-900 hover:!bg-slate-100"
                >
                  Quero usar o Carlog
                </a>
              </div>
            </div>
          </div>

          <div className="mx-auto w-full max-w-[680px]">
            {/* a trilha: os 5 passos lado a lado; o rastro azul cresce com a rolagem */}
            <ol ref={track} className="demo-track relative mb-3 justify-between lg:mb-6" aria-label="Passos">
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
                    <Field label="Descrição" focus={r(0.26, 0.28) > 0 && pos < 0.74} style={fly(r(0.02, 0.24), 'up')}>
                      <span>{typedDesc}</span>
                      {r(0.26, 0.28) > 0 && pos < 0.76 && <Caret />}
                    </Field>
                    <div className="grid grid-cols-2 gap-3 lg:gap-4">
                      <Field label="Valor" focus={r(0.74, 0.76) > 0 && pos < 0.9} style={fly(r(0.5, 0.72), 'right')}>
                        <span>{typedAmount}</span>
                        {r(0.74, 0.76) > 0 && pos < 0.92 && <Caret />}
                      </Field>
                      <Field label="Data" style={fly(r(0.66, 0.9), 'downright')}>
                        {today}
                      </Field>
                    </div>
                    <Field label="Categoria" style={fly(r(1.02, 1.26), 'right')}>
                      <span style={show(r(1.28, 1.42), 6)}>Manutenção</span>
                      <span className="ml-auto text-slate-400">⌄</span>
                    </Field>
                    <div style={fly(r(1.3, 1.54), 'down')}>
                      <div className="mb-1.5 text-[13px] font-medium text-slate-600 dark:text-slate-300">Tipo</div>
                      <div className="flex gap-2 text-sm font-medium">
                        {['Manutenção', 'Valorização', 'Rotina'].map((t, i) => {
                          const on = i === 0 && r(1.56, 1.62) > 0.5
                          return (
                            <span key={t} className={`rounded-full px-3.5 py-1.5 transition-colors ${on ? 'bg-blue-100 text-blue-700 ring-[1.5px] ring-blue-500 dark:bg-blue-950 dark:text-blue-300' : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300'}`}>{t}</span>
                          )
                        })}
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3 lg:gap-4">
                      <Field label="Km (opcional)" style={fly(r(1.55, 1.78), 'right')}>
                        <span style={show(r(1.8, 1.92), 6)}>48.200 km</span>
                      </Field>
                      <div style={fly(r(2.02, 2.26), 'down')}>
                        <div className="mb-1.5 text-[13px] font-medium text-slate-600 dark:text-slate-300">Fotos (até 5)</div>
                        <div className="flex gap-1.5 lg:gap-2">
                          {[0, 1].map((i) => {
                            const a = r(2.3 + i * 0.14, 2.5 + i * 0.14)
                            return a > 0 ? (
                              <span key={i} className={`h-11 w-11 rounded-[10px] bg-linear-to-br lg:h-16 lg:w-16 ${i === 0 ? 'from-blue-700 to-blue-500' : 'from-slate-900 to-blue-700'}`} style={{ opacity: a, transform: `scale(${0.7 + a * 0.3})` }} />
                            ) : null
                          })}
                          <span className="flex h-11 w-11 items-center justify-center rounded-[10px] border border-dashed border-slate-300 text-2xl text-slate-400 lg:h-16 lg:w-16 dark:border-slate-600">+</span>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="px-5 pb-5 lg:px-7 lg:pb-7" style={fly(r(2.5, 2.74), 'down')}>
                    <div
                      className="flex h-[50px] items-center justify-center rounded-xl bg-blue-600 text-base font-semibold text-white"
                      style={{ boxShadow: `0 0 0 ${pressSave * 4}px rgb(59 130 246 / ${pressSave * 0.35})`, transform: `scale(${1 - pressSave * 0.015})` }}
                    >
                      Salvar gasto
                    </div>
                  </div>
                  <div className="demo-toast" style={{ opacity: r(2.88, 2.98), transform: `translate(-50%, ${(1 - r(2.88, 2.98)) * -16}px)` }}>
                    <span className="flex h-5 w-5 items-center justify-center rounded-full bg-green-600 text-[11px] font-bold text-white">✓</span>
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
                      <Field label="Descrição" focus={r(3.5, 3.52) > 0 && pos < 3.74} style={fly(r(3.3, 3.5), 'up')}>
                        <span>{typedOf(PLANNED, r(3.5, 3.72))}</span>
                        {r(3.5, 3.52) > 0 && pos < 3.76 && <Caret />}
                      </Field>
                      <div className="grid grid-cols-2 gap-3 lg:gap-4">
                        <Field label="Valor estimado" style={fly(r(3.58, 3.76), 'right')}>
                          <span style={show(r(3.76, 3.84), 6)}>R$ 400,00</span>
                        </Field>
                        <div style={fly(r(3.64, 3.82), 'downright')}>
                          <div className="mb-1.5 text-[13px] font-medium text-slate-600 dark:text-slate-300">Prioridade</div>
                          <div className="flex gap-2 text-sm font-medium">
                            {['Baixa', 'Média', 'Alta'].map((t, i) => {
                              const on = i === 2 && r(3.82, 3.86) > 0.5
                              return (
                                <span key={t} className={`rounded-full px-3 py-1.5 ${on ? 'bg-red-100 text-red-800 ring-[1.5px] ring-red-400 dark:bg-red-950 dark:text-red-300' : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300'}`}>{t}</span>
                              )
                            })}
                          </div>
                        </div>
                      </div>
                      <div style={fly(r(3.7, 3.86), 'down')}>
                        <div
                          className="flex h-11 items-center justify-center rounded-xl bg-blue-600 text-[15px] font-semibold text-white"
                          style={{ boxShadow: `0 0 0 ${r(3.86, 3.94) * 4}px rgb(59 130 246 / ${r(3.86, 3.94) * 0.35})`, transform: `scale(${1 - r(3.86, 3.94) * 0.015})` }}
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
                              opacity: r(4.2, 4.26) * (1 - r(4.62, 4.72)),
                              transform: `translate(${Math.pow(1 - moveCursor, 2) * 420}px, ${Math.pow(1 - moveCursor, 2) * 300}px) scale(${1 - clickReal * 0.12})`,
                            }}
                          />
                        </span>
                      </div>
                    </div>

                    {/* c) o formulário já vem preenchido; falta o valor real */}
                    <div className="mt-4 space-y-3.5 lg:mt-5 lg:space-y-[18px]" style={fly(r(4.6, 4.78), 'down')}>
                      <p className="text-sm font-medium text-blue-600 dark:text-blue-400">↓ O formulário já vem preenchido</p>
                      <Field label="Descrição">{PLANNED}</Field>
                      <div className="grid grid-cols-2 gap-3 lg:gap-4">
                        <Field label="Valor real" focus={r(4.78, 4.8) > 0 && pos < 4.92}>
                          <span>{typedReal}</span>
                          {r(4.78, 4.8) > 0 && pos < 4.92 && <Caret />}
                        </Field>
                        <Field label="Data">{today}</Field>
                      </div>
                    </div>
                  </div>
                  <div className="px-5 pb-5 lg:px-7 lg:pb-7" style={fly(r(4.64, 4.82), 'down')}>
                    <div
                      className="flex h-[50px] items-center justify-center rounded-xl bg-blue-600 text-base font-semibold text-white"
                      style={{ boxShadow: `0 0 0 ${pressReal * 4}px rgb(59 130 246 / ${pressReal * 0.35})`, transform: `scale(${1 - pressReal * 0.015})` }}
                    >
                      Salvar gasto
                    </div>
                  </div>
                  <div className="demo-toast" style={{ opacity: r(4.95, 5), transform: `translate(-50%, ${(1 - r(4.95, 5)) * -16}px)` }}>
                    <span className="flex h-5 w-5 items-center justify-center rounded-full bg-green-600 text-[11px] font-bold text-white">✓</span>
                    Gasto salvo
                  </div>
                </div>
              </div>
            </div>
          </div>
          </div>
        </div>

        {/* fechamento em tela cheia: a cena se afasta e o convite ocupa o palco (só com o seletor fixo; sem animação fica o convite pequeno da legenda) */}
        <div className="demo-final" data-on={invite > 0.05} style={{ opacity: invite, transform: `translateY(${(1 - invite) * 28}px) scale(${0.94 + 0.06 * invite})` }}>
          <p className="text-[13px] font-semibold tracking-[0.18em] text-blue-300 uppercase">Menos de um minuto, de verdade</p>
          <h3 className="font-display mt-3 max-w-3xl text-4xl leading-[1.05] font-bold tracking-tight text-white lg:text-7xl">Pronto para testar o Carlog?</h3>
          <p className="mt-4 max-w-xl text-base text-slate-300 lg:text-xl">O acesso é liberado manualmente. Mande uma mensagem pelo WhatsApp e você recebe o seu.</p>
          <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row">
            <a
              href={whatsappLink(ACCESS_WHATSAPP, ACCESS_MESSAGE)}
              target="_blank"
              rel="noopener noreferrer"
              className="cta-big btn !gap-2.5 !rounded-2xl !bg-white !px-8 !py-4 !text-lg !font-bold !text-slate-900 hover:!bg-blue-50"
            >
              Quero usar o Carlog
              <span aria-hidden="true">→</span>
            </a>
            <button type="button" onClick={onLogin} className="btn !rounded-2xl border border-white/40 !px-6 !py-4 !text-base !font-semibold text-white hover:bg-white/10">
              Já tenho conta
            </button>
          </div>
        </div>
      </div>
    </section>
  )
}
