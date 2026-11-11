import { useEffect, useRef, useState, type CSSProperties, type ReactNode, type Ref } from 'react'
import { formatDate, todayISO } from '../lib/format'
import { demoSeconds } from '../lib/stopwatch'
import { ramp } from '../lib/wheel'
import { DemoStopwatch } from './DemoStopwatch'
import { useWheel } from './useWheel'

const TITLE = 'Menos de um minuto por gasto.'
const SUBTITLE = 'Lance logo depois de pagar: cada gasto, no lugar certo.'
const DESCRIPTION = 'Troca de óleo e filtro'
const AMOUNT = 'R$ 389,90'
const STEPS = ['Descreva o gasto', 'Escolha o tipo', 'Anexe a nota', 'Salve o gasto']
const SHORT = ['Descreva', 'Tipo', 'Nota', 'Salve']
const STEP_TEXT = ['O que foi, quanto custou e quando.', 'Manutenção, valorização ou rotina.', 'Fotos da nota fiscal e da peça.', 'Um toque e o gasto fica registrado.']
/** Quanta rolagem cada trecho entre dois momentos ganha: o do preenchimento (descrição digitada, valor) é o mais longo. */
const WEIGHTS = [1.3, 1.1, 1.1, 1.3, 0.6] // o último trecho é só uma pausa para o gasto salvo e o tempo final ficarem na tela
const LEN = WEIGHTS.reduce((a, b) => a + b, 0)

/**
 * Posições da cena, em itens (0 a 4). Cada número é um momento em que a cena "para":
 * 0 janela vazia · 1 descrição, valor e data · 2 categoria, tipo e km · 3 fotos e botão de salvar ·
 * 4 salvar é tocado e o aviso "Gasto salvo" aparece (o cronômetro para).
 * Entre dois números, cada pedaço se anima por `ramp` (ver `lib/wheel.ts`); nada aparece antes da sua vez.
 */
const SAVED = 4 // posição em que o gasto está salvo

/*
 * Como a cena anda: a posição (`pos`) chega a cada quadro de rolagem e é APLICADA DIRETO NO DOM (`transform` e `opacity` de cada pedaço,
 * por `ref`), sem renderizar o componente. Renderizar o React a cada quadro era o gargalo no iPhone (a cena atualizava a ~40 quadros por
 * segundo); o padrão que a comunidade e as bibliotecas de animação por rolagem usam é escrever o estilo por referência. O React só é
 * chamado quando algo DISCRETO muda (o passo, os caracteres digitados, o "salvo", os segundos): umas dezenas de vezes na seção inteira.
 */
type Apply = (el: HTMLElement, pos: number) => void

type From = 'up' | 'down' | 'right' | 'downright'
/** Chegada "de fora da tela": o pedaço vem de além da borda (cima, direita ou baixo) e desacelera ao chegar no card. */
const flyIn =
  (from: From, a: number, b: number): Apply =>
  (el, pos) => {
    const r = ramp(pos, a, b)
    const k = Math.pow(1 - r, 3) // 1 longe, 0 no lugar (desacelera no fim)
    const x = from === 'right' || from === 'downright' ? k * 60 : 0 // vw
    const y = from === 'up' ? -k * 70 : from === 'down' || from === 'downright' ? k * 60 : 0 // vh
    el.style.opacity = String(Math.min(1, r * 2.4))
    el.style.transform = `translate(${x}vw, ${y}vh)`
  }
/** Entrada de um pedaço pequeno da cena: sobe um pouco e aparece. */
const riseIn =
  (a: number, b: number, px = 10): Apply =>
  (el, pos) => {
    const r = ramp(pos, a, b)
    el.style.opacity = String(r)
    el.style.transform = `translateY(${(1 - r) * px}px)`
  }
/** A legenda do passo `i`: entra enquanto a anterior sai (a do último passo fica até o fim). */
const legend =
  (i: number): Apply =>
  (el, pos) => {
    const d = pos - (i + 1)
    el.style.opacity = String(i === STEPS.length - 1 && d > 0 ? 1 : Math.max(0, 1 - Math.abs(d) * 1.7))
    el.style.transform = `translateY(${-d * 22}px)`
  }
/** Miniatura de foto `i`: cresce e aparece. */
const photo =
  (i: number): Apply =>
  (el, pos) => {
    const a = ramp(pos, 2.3 + i * 0.14, 2.5 + i * 0.14)
    el.style.opacity = String(a)
    el.style.transform = `scale(${0.7 + a * 0.3})`
  }

/*
 * Camadas próprias (`will-change`) nos campos que voam: a hipótese é que cada uma paga o custo de ser desenhada na PRIMEIRA vez que entra na
 * vista (os campos de cima e de baixo começam fora da tela), e que isso trava os passos com campos voando no iPhone. Para comparar no aparelho,
 * o padrão é SEM camadas e `?camadas=1` na URL liga. (Teste temporário: sai assim que a comparação decidir.)
 */
const SCENE_LAYER = typeof location !== 'undefined' && new URLSearchParams(location.search).has('camadas') ? 'scene-layer' : ''

/** O que depende da posição mas só muda de vez em quando: é o que passa pelo React. */
interface Discrete {
  step: number // -1 antes de a demonstração começar: nenhum passo marcado ainda
  doneCount: number // quantos passos já têm o "✓"
  saved: boolean
  seconds: number
  descLen: number
  amountLen: number
  tipoOn: boolean
  focusDesc: boolean
  caretDesc: boolean
  focusAmount: boolean
  caretAmount: boolean
}
const discreteOf = (pos: number): Discrete => {
  const step = pos < 0.06 ? -1 : Math.max(0, Math.min(STEPS.length - 1, Math.round(pos) - 1))
  const stepDone = step >= 0 && pos >= (step === STEPS.length - 1 ? SAVED - 0.1 : step + 1.95)
  return {
    step,
    doneCount: step < 0 ? 0 : step + (stepDone ? 1 : 0),
    saved: pos >= SAVED - 0.1,
    seconds: demoSeconds(pos, 0.06, SAVED - 0.1),
    descLen: Math.round(ramp(pos, 0.26, 0.7) * DESCRIPTION.length),
    amountLen: Math.round(ramp(pos, 0.74, 0.88) * AMOUNT.length),
    tipoOn: ramp(pos, 1.56, 1.62) > 0.5,
    focusDesc: pos > 0.26 && pos < 0.74,
    caretDesc: pos > 0.26 && pos < 0.76,
    focusAmount: pos > 0.74 && pos < 0.9,
    caretAmount: pos > 0.74 && pos < 0.92,
  }
}
const sameDiscrete = (a: Discrete, b: Discrete) => (Object.keys(a) as (keyof Discrete)[]).every((k) => a[k] === b[k])

function Field({ label, focus = false, innerRef, children }: { label: string; focus?: boolean; innerRef?: Ref<HTMLDivElement>; children?: ReactNode }) {
  return (
    <div ref={innerRef} className={SCENE_LAYER}>
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

/**
 * Seção "Menos de um minuto por gasto": a janela "Novo gasto" começa vazia e fixa na tela; conforme você rola, os campos
 * entram um a um e se preenchem sozinhos (descrição digitada devagar, valor, tipo, fotos, salvar) enquanto um cronômetro
 * corre ao lado e para no "Gasto salvo". Mesma conta de rolagem da seção 4 (`useWheel`), só que mais lenta.
 * Sem movimento, mostra a cena pronta.
 */
export function FeatureDemo() {
  const [d, setD] = useState<Discrete>(() => discreteOf(0))
  // os pedaços da cena que andam por `transform` e `opacity`, aplicados direto no DOM (ver o comentário no topo do arquivo)
  const nodes = useRef(new Map<string, { el: HTMLElement; apply: Apply }>())
  const posRef = useRef(0)
  const bind = (key: string, apply: Apply) => (el: HTMLElement | null) => {
    if (el) {
      nodes.current.set(key, { el, apply })
      apply(el, posRef.current) // já na posição certa ao entrar na tela, sem um quadro "cru"
    } else nodes.current.delete(key)
  }
  const onPosition = (pos: number) => {
    posRef.current = pos
    for (const { el, apply } of nodes.current.values()) apply(el, pos)
    const next = discreteOf(pos)
    setD((prev) => (sameDiscrete(prev, next) ? prev : next))
  }
  const { ref, goTo } = useWheel({ tau: 200, dwell: 0.2, weights: WEIGHTS, staticPosition: SAVED, onPosition })

  const intro = useRef<HTMLDivElement>(null)
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
      // no celular o texto (com o cronômetro) fica em cima da janela, e não ao lado: o que ele ocupa também sai do espaço livre
      const stacked = !!intro.current && !!track.current && track.current.getBoundingClientRect().top >= intro.current.getBoundingClientRect().bottom - 1
      const introH = stacked ? intro.current!.offsetHeight + 16 : 0 // 16 px = o espaço entre os dois (gap-4)
      const free = stage.clientHeight - trackH - introH - 56 // 28 px de folga em cima e embaixo (a área fixa tem sempre a altura da tela)
      setScale(Math.max(0.5, Math.min(1, free / inner.offsetHeight)))
    }
    measure()
    window.addEventListener('resize', measure)
    // fontes que chegam depois, quebras de linha e giro da tela mudam as alturas sem disparar 'resize'
    const observer = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(measure)
    const stage = ref.current?.firstElementChild
    if (stage) observer?.observe(stage)
    if (track.current) observer?.observe(track.current)
    if (intro.current) observer?.observe(intro.current)
    return () => {
      window.removeEventListener('resize', measure)
      observer?.disconnect()
    }
  }, [ref])

  const today = formatDate(todayISO())

  return (
    <section ref={ref} id="cadastrar" aria-labelledby="cadastrar-titulo" className="demo-section demo-bg relative" style={{ '--len': LEN } as CSSProperties}>
      <div className="wheel-stage flex items-center">
        <div className="mx-auto grid w-full max-w-6xl items-center gap-4 px-4 lg:grid-cols-[380px_1fr] lg:gap-16">
          <div ref={intro}>
            <p className="text-[13px] font-semibold tracking-[0.18em] text-blue-300 uppercase">Como funciona</p>
            <h2 id="cadastrar-titulo" className="font-display mt-1.5 text-[28px] leading-[1.1] font-bold tracking-tight text-white lg:mt-2 lg:text-5xl">{TITLE}</h2>
            <p className="mt-3 hidden text-base text-slate-300 sm:block lg:text-[17px]">{SUBTITLE}</p>

            {/* o cronômetro: corre conforme a rolagem e para (verde) quando o gasto é salvo */}
            <DemoStopwatch seconds={d.seconds} done={d.saved} />

            {/* o passo em foco: número, nome e uma frase; cada um aparece quando chega a sua vez */}
            <div className="relative mt-3 h-[72px] lg:mt-6 lg:h-28">
              {STEPS.map((label, i) => (
                <div key={label} ref={bind(`legenda${i}`, legend(i))} className="demo-legend absolute inset-x-0 top-0">
                  <p className="font-display text-sm font-bold text-blue-300">0{i + 1} / 0{STEPS.length}</p>
                  <p className="font-display mt-0.5 text-xl font-bold text-white lg:mt-1 lg:text-[28px]">{label}</p>
                  <p className="mt-0.5 text-sm text-slate-300 lg:mt-1 lg:text-[15px]">{STEP_TEXT[i]}</p>
                </div>
              ))}
              {/* dica de rolagem no espaço da legenda (vazia no começo); some quando a legenda do passo 1 entra */}
              <div
                aria-hidden="true"
                ref={bind('dica', (el, pos) => el.style.setProperty('--hint', String(1 - ramp(pos, 0.02, 0.22))))}
                className="demo-hint absolute inset-x-0 top-0"
              >
                <span>Role para ver</span>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className="demo-hint-arrow">
                  <path d="M6 9l6 6 6-6" />
                </svg>
              </div>
            </div>
          </div>

          <div className="mx-auto w-full max-w-[680px]">
            {/* a trilha: os 5 passos lado a lado; o rastro azul cresce com a rolagem */}
            <ol ref={track} className="demo-track relative mb-3 justify-between lg:mb-6" aria-label="Passos">
              <span aria-hidden="true" className="absolute top-3.5 right-3.5 left-3.5 h-0.5 rounded-full bg-white/15" />
              {/* o rastro e a bolinha andam só por `transform` (largura e `left` forçariam layout a cada quadro de rolagem) */}
              <span
                aria-hidden="true"
                ref={bind('rastro', (el, pos) => (el.style.transform = `scaleX(${ramp(pos, 1, SAVED)})`))}
                className="absolute top-3.5 right-3.5 left-3.5 h-0.5 origin-left rounded-full bg-linear-to-r from-blue-600 to-blue-300"
              />
              <span aria-hidden="true" className="pointer-events-none absolute top-[9px] right-3.5 left-3.5 h-3">
                {/* a faixa de largura total desliza para a esquerda; a bolinha fica na ponta direita dela. Só aparece no meio do caminho. */}
                <span
                  ref={bind('bolinha', (el, pos) => {
                    const r = ramp(pos, 1, SAVED)
                    el.style.opacity = r > 0 && r < 1 ? '1' : '0'
                    el.style.transform = `translateX(${(r - 1) * 100}%)`
                  })}
                  className="absolute inset-0 will-change-transform"
                >
                  <span className="absolute top-0 right-0 size-3 translate-x-1/2 rounded-full bg-blue-200 shadow-[0_0_14px_4px_rgb(96_165_250_/_0.9)]" />
                </span>
              </span>
              {STEPS.map((label, i) => {
                const done = i < d.doneCount
                const now = i === d.step
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
                {/* a sombra do cartão, numa camada própria (ver `.demo-shadow` no CSS) */}
                <div className="demo-shadow absolute inset-0" aria-hidden="true" />
                {/* cena 1: janela "Novo gasto" — começa vazia */}
                <div
                  className="demo-card absolute inset-0 flex flex-col"
                  style={{ pointerEvents: 'none' }}
                  aria-hidden="true"
                >
                  <div className="flex h-14 items-center justify-between border-b border-slate-200 px-5 lg:h-[68px] lg:px-7 dark:border-slate-800">
                    <span className="font-display text-xl font-bold lg:text-[22px]">Novo gasto</span>
                    <span className="text-slate-400">✕</span>
                  </div>
                  <div className="flex-1 space-y-3.5 px-5 pt-4 lg:space-y-[18px] lg:px-7 lg:pt-5">
                    <Field label="Descrição" focus={d.focusDesc} innerRef={bind('descricao', flyIn('up', 0.02, 0.24))}>
                      <span>{DESCRIPTION.slice(0, d.descLen)}</span>
                      {d.caretDesc && <Caret />}
                    </Field>
                    <div className="grid grid-cols-2 gap-3 lg:gap-4">
                      <Field label="Valor" focus={d.focusAmount} innerRef={bind('valor', flyIn('right', 0.5, 0.72))}>
                        <span>{AMOUNT.slice(0, d.amountLen)}</span>
                        {d.caretAmount && <Caret />}
                      </Field>
                      <Field label="Data" innerRef={bind('data', flyIn('downright', 0.66, 0.9))}>
                        {today}
                      </Field>
                    </div>
                    <Field label="Categoria" innerRef={bind('categoria', flyIn('right', 1.02, 1.26))}>
                      <span ref={bind('categoria-valor', riseIn(1.28, 1.42, 6))}>Manutenção</span>
                      <span className="ml-auto text-slate-400">⌄</span>
                    </Field>
                    <div ref={bind('tipo', flyIn('down', 1.3, 1.54))} className={SCENE_LAYER}>
                      <div className="mb-1.5 text-[13px] font-medium text-slate-600 dark:text-slate-300">Tipo</div>
                      <div className="flex gap-2 text-sm font-medium">
                        {['Manutenção', 'Valorização', 'Rotina'].map((t, i) => {
                          const on = i === 0 && d.tipoOn
                          return (
                            <span key={t} className={`rounded-full px-3.5 py-1.5 transition-colors ${on ? 'bg-blue-100 text-blue-700 ring-[1.5px] ring-blue-500 dark:bg-blue-950 dark:text-blue-300' : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300'}`}>{t}</span>
                          )
                        })}
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3 lg:gap-4">
                      <Field label="Km (opcional)" innerRef={bind('km', flyIn('right', 1.55, 1.78))}>
                        <span ref={bind('km-valor', riseIn(1.8, 1.92, 6))}>48.200 km</span>
                      </Field>
                      <div ref={bind('fotos', flyIn('down', 2.02, 2.26))} className={SCENE_LAYER}>
                        <div className="mb-1.5 text-[13px] font-medium text-slate-600 dark:text-slate-300">Fotos (até 5)</div>
                        <div className="flex gap-1.5 lg:gap-2">
                          {[0, 1].map((i) => (
                            <span
                              key={i}
                              ref={bind(`foto${i}`, photo(i))}
                              className={`h-11 w-11 rounded-[10px] bg-linear-to-br lg:h-16 lg:w-16 ${i === 0 ? 'from-blue-700 to-blue-500' : 'from-slate-900 to-blue-700'}`}
                            />
                          ))}
                          <span className="flex h-11 w-11 items-center justify-center rounded-[10px] border border-dashed border-slate-300 text-2xl text-slate-400 lg:h-16 lg:w-16 dark:border-slate-600">+</span>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div ref={bind('salvar', flyIn('down', 2.7, 2.94))} className={`${SCENE_LAYER} px-5 pb-5 lg:px-7 lg:pb-7`}>
                    {/* o toque em "Salvar": o botão afunda um pouco e um anel aparece (por opacidade; animar um `box-shadow` por quadro repinta o cartão) */}
                    <div
                      ref={bind('salvar-botao', (el, pos) => (el.style.transform = `scale(${1 - ramp(pos, 3.45, 3.6) * 0.015})`))}
                      className="relative flex h-[50px] items-center justify-center rounded-xl bg-blue-600 text-base font-semibold text-white"
                    >
                      <span aria-hidden="true" ref={bind('salvar-anel', (el, pos) => (el.style.opacity = String(ramp(pos, 3.45, 3.6))))} className="pointer-events-none absolute inset-0 rounded-xl opacity-0 ring-4 ring-blue-500/35" />
                      Salvar gasto
                    </div>
                  </div>
                  <div
                    ref={bind('aviso', (el, pos) => {
                      const t = ramp(pos, 3.68, 3.9)
                      el.style.opacity = String(t)
                      el.style.transform = `translate(-50%, ${(1 - t) * -16}px)`
                    })}
                    className="demo-toast"
                  >
                    <span className="flex h-5 w-5 items-center justify-center rounded-full bg-green-600 text-[11px] font-bold text-white">✓</span>
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
