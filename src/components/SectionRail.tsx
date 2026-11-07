import { useEffect, useRef, useState, type CSSProperties } from 'react'
import { railPosition } from '../lib/scroll'
import { useMediaQuery } from './useMediaQuery'

/** As seções da landing, na ordem em que aparecem: o `id` é o da seção na página. */
const STOPS = [
  { id: 'inicio', label: 'Início' },
  { id: 'tudo', label: 'Tudo em um só lugar' },
  { id: 'cadastrar', label: 'Como funciona' },
  { id: 'raio-x', label: 'Raio-X' },
  { id: 'comecar', label: 'Começar' },
] as const

/** Quanto da primeira tela já foi rolado (fração da altura da janela) até o "Você está aqui" sumir. */
const START_ZONE = 0.2

/** O carrinho visto de cima, de frente para baixo (é para onde ele anda). Desenhado em código, como o logo. */
function Car() {
  return (
    <svg viewBox="0 0 22 40" aria-hidden="true" className="block h-auto w-2 drop-shadow-[0_2px_3px_rgb(0_0_0_/_0.55)] md:w-[26px]">
      <defs>
        <linearGradient id="rail-car-body" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#1d4ed8" />
          <stop offset="0.5" stopColor="#60a5fa" />
          <stop offset="1" stopColor="#1d4ed8" />
        </linearGradient>
        <linearGradient id="rail-car-glass" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#0b1220" />
          <stop offset="1" stopColor="#1e3a8a" />
        </linearGradient>
      </defs>
      <rect x="0.5" y="21" width="2.4" height="3.4" rx="1.2" fill="#1d4ed8" />
      <rect x="19.1" y="21" width="2.4" height="3.4" rx="1.2" fill="#1d4ed8" />
      <rect x="2" y="1" width="18" height="37" rx="7" fill="url(#rail-car-body)" />
      <rect x="4.5" y="5.5" width="13" height="6" rx="2" fill="url(#rail-car-glass)" />
      <rect x="4.5" y="12" width="13" height="10.5" rx="3" fill="#bfdbfe" opacity="0.9" />
      <path d="M4.8 23.5h12.4l-1.4 8H6.2z" fill="url(#rail-car-glass)" />
      <path d="M5.5 34h11" stroke="#dbeafe" strokeOpacity="0.45" strokeWidth="0.8" strokeLinecap="round" />
      <rect x="3.6" y="1.8" width="4" height="1.6" rx="0.8" fill="#ef4444" />
      <rect x="14.4" y="1.8" width="4" height="1.6" rx="0.8" fill="#ef4444" />
      <circle cx="5.6" cy="36" r="1.7" fill="#fef9c3" />
      <circle cx="16.4" cy="36" r="1.7" fill="#fef9c3" />
    </svg>
  )
}

/**
 * (Ancorado em `top: calc(50 * var(--sh))` e não em `top: 50%`: num elemento fixo `%` é a altura ATUAL da janela, que cresce quando a barra
 * de endereço encolhe no primeiro gesto de rolagem; o trilho escorregava uns 20 px nesse instante. `--sh` é a altura medida uma vez.)
 * Mapa da página, fixo na borda direita: uma "ruazinha" com uma parada por seção e um carrinho que desce por ela conforme a
 * rolagem ("você está aqui"). O nome da seção aparece por um instante quando a parada atual muda e, para todas, ao passar o
 * mouse (só no computador, para não cobrir o conteúdo). No começo da página o carrinho diz "Você está aqui". Clicar numa
 * parada leva até a seção. No computador o fundo escurecido e translúcido deixa o mapa legível nas seções claras e escuras.
 * No celular o trilho é só a rua e o carrinho, finos, dentro da margem de 16 px da página (sem fundo, sem desfoque, sem nomes e sem
 * receber toques): não cobre botões nem textos. A rua tem asfalto escuro e bordas claras, então se vê nos dois fundos.
 * A posição do carrinho vai direto para o estilo (`--pos`); só a parada atual e o "começo" viram estado do React.
 */
export function SectionRail() {
  const pin = useRef<HTMLSpanElement>(null)
  const fill = useRef<HTMLSpanElement>(null)
  const seen = useRef({ near: 0, passed: 0, atStart: true }) // últimos valores enviados ao React: só chama `set*` quando mudam
  const [near, setNear] = useState(0) // parada mais próxima do carrinho
  const [passed, setPassed] = useState(0) // última parada que o carrinho já alcançou
  const [atStart, setAtStart] = useState(true)
  const reduced = useMediaQuery('(prefers-reduced-motion: reduce)')
  const wide = useMediaQuery('(min-width: 768px)') // abaixo disso o trilho é só visual: sem rótulos, sem toque e sem foco
  const [flash, setFlash] = useState(false) // o nome da parada atual aparece um instante quando ela muda

  useEffect(() => {
    // as medidas só mudam ao redimensionar ou quando o conteúdo carrega (a altura da página muda): ficam guardadas e a rolagem só lê `scrollY`
    let tops: number[] = []
    let docHeight = 0
    const measure = () => {
      tops = STOPS.map(({ id }) => {
        const el = document.getElementById(id)
        return el ? el.getBoundingClientRect().top + window.scrollY : 0
      })
      docHeight = document.documentElement.scrollHeight
    }
    let frame = 0
    const update = () => {
      frame = 0
      const pos = railPosition(tops, window.scrollY, window.innerHeight, docHeight)
      // a posição vai só para os dois elementos que a usam: escrever na `nav` obrigaria o navegador a revisar o estilo do trilho inteiro a cada frame
      const value = pos.toFixed(3)
      pin.current?.style.setProperty('--pos', value)
      fill.current?.style.setProperty('--pos', value)
      const next = { near: Math.round(pos), passed: Math.floor(pos + 0.001), atStart: window.scrollY < window.innerHeight * START_ZONE }
      if (next.near !== seen.current.near) setNear(next.near)
      if (next.passed !== seen.current.passed) setPassed(next.passed)
      if (next.atStart !== seen.current.atStart) setAtStart(next.atStart)
      seen.current = next
    }
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(update)
    }
    const onResize = () => {
      measure()
      onScroll()
    }
    measure()
    update()
    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', onResize)
    // as seções fixas e as fontes mudam a altura da página depois de carregar
    const observer = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(onResize)
    observer?.observe(document.documentElement)
    return () => {
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', onResize)
      observer?.disconnect()
      if (frame) cancelAnimationFrame(frame)
    }
  }, [])

  // compara com a parada anterior (e não com "primeira vez"): em desenvolvimento o StrictMode roda o efeito duas vezes ao montar
  const lastNear = useRef(near)
  useEffect(() => {
    if (lastNear.current === near) return
    lastNear.current = near
    // só mostra o nome quando o carrinho para um instante na parada; assim, ao atravessar várias numa rolagem rápida, os nomes não piscam
    let hide = 0
    const show = setTimeout(() => {
      setFlash(true)
      hide = window.setTimeout(() => setFlash(false), 2000)
    }, 350)
    return () => {
      clearTimeout(show)
      clearTimeout(hide)
      setFlash(false)
    }
  }, [near])

  const goTo = (id: string) => {
    const el = document.getElementById(id)
    if (el) window.scrollTo({ top: el.getBoundingClientRect().top + window.scrollY, behavior: reduced ? 'auto' : 'smooth' })
  }

  return (
    <nav
      aria-label="Seções da página"
      aria-hidden={wide ? undefined : true}
      className="rail group pointer-events-none fixed top-[calc(50*var(--sh,1svh))] right-[max(1px,env(safe-area-inset-right))] z-50 -translate-y-1/2 md:pointer-events-auto md:right-5 [--d:12px] [--gap:34px] [--road:12px] [--over:2px] md:[--d:22px] md:[--gap:70px] md:[--road:36px] md:[--over:8px]"
      style={{ '--steps': STOPS.length - 1 } as CSSProperties}
    >
      <div className="relative py-2 md:rounded-full md:border md:border-white/15 md:bg-slate-900/60 md:px-1.5 md:py-4 md:backdrop-blur-md">
        <div className="relative">
          {/* a rua: asfalto com a faixa pontilhada no meio e, por cima, o trecho já percorrido */}
          <span aria-hidden="true" className="rail-road absolute left-1/2 -translate-x-1/2">
            <span ref={fill} className="rail-fill" style={{ '--pos': 0 } as CSSProperties} />
          </span>

          <ol className="relative flex flex-col" style={{ gap: 'var(--gap)' }}>
            {STOPS.map(({ id, label }, i) => {
              const here = i === near
              const showLabel = here && (flash || atStart)
              return (
                <li key={id} className="relative flex justify-center">
                  {/* a parada: uma faixa atravessando a rua (azul depois que o carrinho passa) */}
                  <button type="button" disabled={!wide} onClick={() => goTo(id)} aria-label={`Ir para ${label}`} aria-current={here ? 'location' : undefined} className="rail-stop flex items-center justify-center">
                    <span className={`block h-[3px] w-full rounded-full transition-colors motion-reduce:transition-none ${i <= passed ? 'bg-blue-300' : 'bg-white/70'}`} />
                  </button>
                  {/* o nome da seção, à esquerda da rua (só em telas largas) */}
                  <span
                    aria-hidden="true"
                    className={`pointer-events-none absolute top-1/2 right-full mr-3 hidden -translate-y-1/2 items-center gap-2 rounded-full border border-white/20 bg-slate-900/80 px-3 py-1.5 text-[13px] font-medium whitespace-nowrap text-white transition-opacity duration-300 motion-reduce:transition-none group-focus-within:opacity-100 group-hover:opacity-100 md:flex ${showLabel ? 'opacity-100' : 'opacity-0'} ${showLabel && atStart && i === 0 ? 'rail-here' : ''}`}
                  >
                    {i === 0 ? (
                      /* "Você está aqui" é o texto do início; o nome ("Início") só aparece quando a pessoa mexe no trilho à mão (mouse ou foco).
                         Como o texto não troca ao começar a rolar, o rótulo some sem piscar "Início". */
                      <>
                        <span className="group-focus-within:hidden group-hover:hidden">Você está aqui</span>
                        <span className="hidden items-center gap-2 group-focus-within:flex group-hover:flex">
                          <span className="font-display text-xs font-bold text-blue-300">01</span>
                          {label}
                        </span>
                      </>
                    ) : (
                      <>
                        <span className="font-display text-xs font-bold text-blue-300">0{i + 1}</span>
                        {label}
                      </>
                    )}
                  </span>
                </li>
              )
            })}
          </ol>

          {/* o carrinho: desce pela rua conforme a rolagem */}
          <span ref={pin} aria-hidden="true" className="rail-pin pointer-events-none absolute top-0 left-1/2" style={{ '--pos': 0 } as CSSProperties}>
            {/* no começo da página o carrinho também pulsa: no celular não há rótulo, então é o único "você está aqui" */}
            {atStart && <span className="rail-here absolute top-1/2 left-1/2 size-5 -translate-x-1/2 -translate-y-1/2 rounded-full md:size-7" />}
            <Car />
          </span>
        </div>
      </div>
    </nav>
  )
}
