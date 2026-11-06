import { useEffect, useRef, useState, type CSSProperties } from 'react'
import { railPosition } from '../lib/scroll'

/** As seções da landing, na ordem em que aparecem: o `id` é o da seção na página. */
const STOPS = [
  { id: 'inicio', label: 'Início' },
  { id: 'tudo', label: 'Tudo em um só lugar' },
  { id: 'cadastrar', label: 'Como funciona' },
  { id: 'raio-x', label: 'Raio-X' },
  { id: 'comecar', label: 'Começar' },
] as const

/** Quanto da primeira tela já foi rolado (fração da altura da janela) até a dica de "role até aqui" sumir. */
const START_ZONE = 0.2

const reducedMotion = () => typeof window !== 'undefined' && !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches

/**
 * Mapa da página, fixo na borda direita: um ponto por seção, ligados por uma linha, e um marcador ("você está aqui")
 * que desliza pelo caminho conforme a rolagem. O nome da seção aparece por um instante quando o ponto atual muda e, para todos
 * os pontos, ao passar o mouse (só no computador, para não cobrir o conteúdo). No começo da página o primeiro diz
 * "Você está aqui" e o segundo pulsa, convidando a rolar até ele. Clicar num ponto leva até a seção.
 * O fundo escurecido e translúcido deixa o mapa legível tanto nas seções escuras quanto nas claras.
 * A posição do marcador vai direto para o estilo (`--pos`); só o ponto atual e o "começo" viram estado do React.
 */
export function SectionRail() {
  const root = useRef<HTMLElement>(null)
  const [near, setNear] = useState(0) // ponto mais próximo do marcador
  const [passed, setPassed] = useState(0) // último ponto que o marcador já alcançou
  const [atStart, setAtStart] = useState(true)
  const [flash, setFlash] = useState(false) // o nome do ponto atual aparece um instante quando ele muda

  useEffect(() => {
    const tops = () => STOPS.map(({ id }) => {
      const el = document.getElementById(id)
      return el ? el.getBoundingClientRect().top + window.scrollY : 0
    })
    let frame = 0
    const update = () => {
      frame = 0
      const doc = document.documentElement
      const pos = railPosition(tops(), window.scrollY, window.innerHeight, doc.scrollHeight)
      root.current?.style.setProperty('--pos', pos.toFixed(3))
      setNear(Math.round(pos))
      setPassed(Math.floor(pos + 0.001))
      setAtStart(window.scrollY < window.innerHeight * START_ZONE)
    }
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(update)
    }
    update()
    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', onScroll)
    // as seções fixas e as fontes mudam a altura da página depois de carregar
    const observer = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(onScroll)
    observer?.observe(document.documentElement)
    return () => {
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', onScroll)
      observer?.disconnect()
      if (frame) cancelAnimationFrame(frame)
    }
  }, [])

  const firstRun = useRef(true)
  useEffect(() => {
    if (firstRun.current) {
      firstRun.current = false
      return
    }
    setFlash(true)
    const t = setTimeout(() => setFlash(false), 2000)
    return () => clearTimeout(t)
  }, [near])

  const goTo = (id: string) => {
    const el = document.getElementById(id)
    if (el) window.scrollTo({ top: el.getBoundingClientRect().top + window.scrollY, behavior: reducedMotion() ? 'auto' : 'smooth' })
  }

  return (
    <nav
      ref={root}
      aria-label="Seções da página"
      className="rail group fixed top-1/2 right-1 z-50 -translate-y-1/2 [--d:14px] [--gap:34px] md:right-5 md:[--d:20px] md:[--gap:64px]"
      style={{ '--pos': 0, '--steps': STOPS.length - 1 } as CSSProperties}
    >
      <div className="relative rounded-full border border-white/15 bg-slate-900/60 px-[3px] py-2 backdrop-blur-md md:px-1.5 md:py-3">
        <div className="relative">
          {/* o caminho: a linha de fundo e, por cima, a parte já percorrida */}
          <span aria-hidden="true" className="rail-track absolute left-1/2 w-0.5 -translate-x-1/2 rounded-full bg-white/25">
            <span className="rail-fill block w-full rounded-full bg-blue-400" />
          </span>

          <ol className="relative flex flex-col" style={{ gap: 'var(--gap)' }}>
            {STOPS.map(({ id, label }, i) => {
              const here = i === near
              const invite = atStart && i === 1
              const text = atStart && i === 0 ? 'Você está aqui' : label
              const showLabel = invite || (here && (flash || atStart))
              return (
                <li key={id} className="relative">
                  <button type="button" onClick={() => goTo(id)} aria-label={`Ir para ${label}`} aria-current={here ? 'location' : undefined} className="rail-dot flex items-center justify-center rounded-full">
                    <span
                      className={`rail-dot-mark block size-2 rounded-full border transition-colors md:size-3 ${i <= passed ? 'border-blue-400 bg-blue-400' : 'border-white/60 bg-slate-900'} ${invite ? 'rail-invite' : ''}`}
                    />
                  </button>
                  {/* o nome da seção, à esquerda do ponto (só em telas largas) */}
                  <span
                    aria-hidden="true"
                    className={`pointer-events-none absolute top-1/2 right-full mr-3 hidden -translate-y-1/2 items-center gap-2 rounded-full border px-3 py-1.5 text-[13px] font-medium whitespace-nowrap transition-opacity duration-300 group-focus-within:opacity-100 group-hover:opacity-100 md:flex ${showLabel ? 'opacity-100' : 'opacity-0'} ${invite ? 'border-blue-300/40 bg-blue-500/25 text-blue-100' : 'border-white/20 bg-slate-900/80 text-white'}`}
                  >
                    {invite ? <span className="rail-invite-arrow">↓</span> : <span className="font-display text-xs font-bold text-blue-300">0{i + 1}</span>}
                    {invite ? label : text}
                  </span>
                </li>
              )
            })}
          </ol>

          {/* o marcador "você está aqui": desliza pelo caminho */}
          <span aria-hidden="true" className="rail-pin pointer-events-none absolute left-1/2 flex items-center justify-center">
            <span className="size-2.5 rounded-full bg-blue-300 shadow-[0_0_0_4px_rgb(59_130_246_/_0.35),0_0_14px_3px_rgb(96_165_250_/_0.8)] md:size-3.5" />
          </span>
        </div>
      </div>
    </nav>
  )
}
