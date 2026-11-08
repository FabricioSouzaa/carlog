import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { FitScreen, TabsControlProvider, type TabId, type TabsControl } from './AppScreens'
import { useMediaQuery } from './useMediaQuery'

/** As telas do app, na ordem das abas, com a frase que aparece embaixo da janela. */
const TABS: { id: TabId; label: string; text: string }[] = [
  { id: 'visao', label: 'Visão geral', text: 'seus totais e gráficos, num olhar.' },
  { id: 'gastos', label: 'Gastos', text: 'cada gasto com valor, data, km e foto da nota.' },
  { id: 'planejados', label: 'Planejados', text: 'o que vem pela frente, com valor e prioridade.' },
  { id: 'ajustes', label: 'Ajustes', text: 'categorias, backup e segurança da conta.' },
]

const MOVE_MS = 650 // o cursor desliza até a aba
const CLICK_LEAD_MS = 120 // do anel do clique até a tela trocar
const DWELL_MS = 1700 // quanto cada tela fica na janela (curto: quem não entende que é uma demonstração acha que travou)
const START_MS = 700 // com a janela embaçada, espera antes de o cursor se mexer
const FROST_MS = 600 // ao recomeçar o ciclo: a janela embaça e, depois disso, o cursor volta

const Arrow = () => (
  <svg width="30" height="30" viewBox="0 0 24 24" fill="none" aria-hidden="true" className="drop-shadow-md">
    <path d="M5 3l14 8-6 2 4 7-3 1-4-7-5 4z" fill="#0f172a" stroke="#fff" strokeWidth="1.6" strokeLinejoin="round" />
  </svg>
)

/**
 * "Tudo em um só lugar": uma janela do app que CHEGA EMBAÇADA (e as abas também); um cursor aparece, clica em "Visão geral", a janela
 * entra em foco e o conteúdo acontece (os blocos entram em sequência, as barras crescem); depois ele percorre as outras abas, acendendo
 * cada uma ao clicar. No fim do ciclo a janela embaça de novo e recomeça. É uma animação por TEMPO e não presa à rolagem (as seções 3 e 4
 * já são): roda só enquanto a janela está na tela. Clicar numa aba assume o controle (acende tudo e o automático pára); há botão de
 * pausa; com `prefers-reduced-motion` nada embaça nem anda sozinho e as abas continuam clicáveis.
 * As telas são as réplicas de `AppScreens`; as abas delas são as do próprio desenho, tornadas clicáveis por `TabsControlProvider`.
 */
export function FeatureTabs() {
  const stage = useRef<HTMLDivElement>(null)
  const tabEls = useRef(new Map<TabId, HTMLElement>())
  const activeRef = useRef(0)
  const targetRef = useRef(0) // aba para onde o cursor aponta (para reapontar se a tela mudar de tamanho)
  const revealedRef = useRef(false)
  const pausedRef = useRef(false)
  const [active, setActive] = useState(0)
  const [paused, setPaused] = useState(false)
  const [visible, setVisible] = useState(() => typeof IntersectionObserver === 'undefined') // sem IntersectionObserver, anda sempre
  const [revealed, setRevealed] = useState(false) // a janela já entrou em foco neste ciclo?
  const [epoch, setEpoch] = useState(0)
  const [reached, setReached] = useState(-1) // última aba que o cursor já clicou neste ciclo (-1: nenhuma, tudo fosco)
  const [heading, setHeading] = useState<TabId | null>(null) // aba para a qual o cursor está indo (pulsa até o clique)
  const [cursor, setCursor] = useState({ x: 520, y: 330, shown: false })
  const [press, setPress] = useState(0)
  const reduced = useMediaQuery('(prefers-reduced-motion: reduce)')
  const touch = useMediaQuery('(hover: none)')
  useEffect(() => {
    pausedRef.current = paused
  })
  const playing = visible && !paused && !reduced
  // a janela fica embaçada até o cursor "ligar" a demonstração; se a pessoa assumir o controle, pausar ou preferir menos movimento, nítida
  const frosted = !reduced && !paused && !revealed

  const select = useCallback((i: number) => {
    activeRef.current = i
    setActive(i)
  }, [])

  const reveal = useCallback((on: boolean) => {
    if (on === revealedRef.current) return // só a transição conta: clicar na aba que já está aberta não refaz o conteúdo
    revealedRef.current = on
    setRevealed(on)
    if (on) setEpoch((n) => n + 1) // refaz o conteúdo já nítido, para a entrada acontecer diante de quem olha
  }, [])

  // onde apontar (em px da tela, dentro da janela) para clicar na aba `i`
  const aim = useCallback((i: number) => {
    const tab = tabEls.current.get(TABS[i].id)
    const box = stage.current
    if (!tab || !box) return null
    const t = tab.getBoundingClientRect()
    const b = box.getBoundingClientRect()
    return { x: t.left - b.left + t.width * 0.5, y: t.top - b.top + t.height * 0.62 }
  }, [])

  const point = useCallback(
    (i: number) => {
      targetRef.current = i
      const p = aim(i)
      if (p) setCursor({ ...p, shown: true })
    },
    [aim],
  )

  // só enquanto a demonstração anda as abas ainda não clicadas ficam foscas; pausada, clicada por você ou com movimento reduzido, todas acesas
  const locked = useMemo(() => (playing ? new Set(TABS.slice(reached + 1).map((t) => t.id)) : new Set<TabId>()), [playing, reached])
  const headingNow = playing ? heading : null

  // estável: só muda quando uma aba é destravada, a janela é revelada ou o cursor muda de alvo, e não a cada passo da animação
  const control = useMemo<TabsControl>(
    () => ({
      onSelect: (id) => {
        select(TABS.findIndex((t) => t.id === id))
        reveal(true)
        setPaused(true) // clicar numa aba é assumir o controle: o automático pára
      },
      setTabEl: (id, el) => {
        if (el) tabEls.current.set(id, el)
        else tabEls.current.delete(id)
      },
      focusTab: (id) => tabEls.current.get(id)?.focus(),
      locked,
      heading: headingNow,
      epoch,
    }),
    [select, reveal, locked, headingNow, epoch],
  )

  // girar o celular ou redimensionar a janela muda a escala da réplica: o cursor reaponta (senão ficaria no px antigo)
  useEffect(() => {
    const el = stage.current
    if (!el || typeof ResizeObserver === 'undefined') return
    const observer = new ResizeObserver(() => {
      const p = aim(targetRef.current)
      if (p) setCursor((c) => (c.shown ? { ...p, shown: true } : c))
    })
    observer.observe(el)
    return () => observer.disconnect()
  }, [aim])

  // só anima enquanto a janela está (quase toda) na tela; ao sair da tela a janela volta a embaçar, para a próxima chegada ser nova
  useEffect(() => {
    const el = stage.current
    if (!el || typeof IntersectionObserver === 'undefined') return
    // 0,3 e não mais: numa tela baixa (celular deitado, zoom grande) a janela inteira nunca chegaria a 60% visível e a demonstração não começaria
    const io = new IntersectionObserver(([entry]) => {
      setVisible(entry.isIntersecting)
      // se a pessoa assumiu o controle (pausou ou clicou), a janela fica como ela deixou; senão, volta ao começo (embaçada, na Visão geral)
      if (!entry.isIntersecting && !pausedRef.current) {
        revealedRef.current = false
        setRevealed(false)
        setReached(-1)
        activeRef.current = 0
        setActive(0)
      }
    }, { threshold: 0.3 })
    io.observe(el)
    return () => io.disconnect()
  }, [])

  // o roteiro: janela embaçada -> o cursor aparece e clica em "Visão geral" (a janela entra em foco) -> percorre as outras abas, acendendo
  // cada uma -> ao dar a volta, a janela embaça de novo e recomeça. Retomando uma pausa (já revelada), continua de onde estava.
  useEffect(() => {
    if (!playing) return
    const timers: number[] = []
    const at = (ms: number, fn: () => void) => void timers.push(window.setTimeout(fn, ms))
    const run = (i: number) => {
      point(i)
      setHeading(TABS[i].id)
      at(MOVE_MS, () => setPress((n) => n + 1))
      at(MOVE_MS + CLICK_LEAD_MS, () => {
        setHeading(null)
        select(i)
        setReached(i) // acende a aba clicada
        if (i === 0) reveal(true) // o clique em "Visão geral" põe a janela em foco
        const next = (i + 1) % TABS.length
        at(DWELL_MS, () => {
          if (next !== 0) return run(next)
          // deu a volta: a janela embaça de novo e o ciclo recomeça
          reveal(false)
          setReached(-1)
          select(0)
          at(FROST_MS + START_MS, () => run(0))
        })
      })
    }
    if (revealedRef.current) {
      const from = activeRef.current
      at(40, () => {
        point(from)
        setReached(from)
      })
      at(START_MS, () => run((from + 1) % TABS.length))
    } else {
      at(40, () => {
        select(0)
        setReached(-1)
      })
      at(START_MS, () => run(0))
    }
    return () => timers.forEach((t) => window.clearTimeout(t))
  }, [playing, point, select, reveal])

  const current = TABS[active]
  return (
    <section id="tudo" aria-labelledby="abas" className="bg-slate-50 px-4 py-20 md:py-28 dark:bg-slate-950">
      <div className="mx-auto max-w-3xl text-center">
        <p className="text-[13px] font-semibold tracking-[0.18em] text-blue-600 uppercase dark:text-blue-400">O sistema</p>
        <h2 id="abas" className="font-display mt-2 text-4xl leading-[1.08] font-bold tracking-tight md:text-5xl">Tudo em um só lugar</h2>
        <p className="muted mt-3 !text-base md:!text-[17px]">Quatro telas, uma para cada parte da vida do seu carro.</p>
      </div>

      <div className="mx-auto mt-10 w-full max-w-[820px]">
        {/* quem chega pelo teclado e põe o foco na janela pausa a demonstração (senão a tela e a aba mudariam sozinhas debaixo do foco) */}
        <div ref={stage} className="relative" onFocusCapture={(e) => { if ((e.target as HTMLElement).matches(':focus-visible')) setPaused(true) }}>
          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_24px_60px_rgba(15,23,42,0.14)] dark:border-slate-800 dark:bg-slate-900">
            {/* embaçada até o cursor clicar em "Visão geral": entra em foco e o conteúdo acontece */}
            <div className={`transition-[filter,opacity] duration-700 motion-reduce:transition-none ${frosted ? 'opacity-60 blur-[7px]' : ''}`}>
              <TabsControlProvider value={control}>
                <FitScreen screen={current.id} />
              </TabsControlProvider>
            </div>
          </div>
          {/* o cursor (ou o toque) e o anel do clique; fora da janela escalada, em px da tela */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute top-0 left-0 z-20"
            style={{
              transform: `translate(${cursor.x}px, ${cursor.y}px)`,
              // o cursor só aparece enquanto a demonstração anda (pausada, fora da tela ou com movimento reduzido, some)
              opacity: playing && cursor.shown ? 1 : 0,
              transition: `transform ${MOVE_MS}ms cubic-bezier(0.4, 0, 0.2, 1), opacity 250ms`,
            }}
          >
            {press > 0 && <span key={press} className="tab-click-ring absolute -top-5 -left-5 h-10 w-10 rounded-full border-2 border-blue-500 bg-blue-500/15" />}
            {!touch && (
              <span className="absolute -top-0.5 -left-1">
                <Arrow />
              </span>
            )}
          </div>
        </div>

        <div className="mt-6 flex flex-col items-center gap-3">
          <p className="text-center text-base text-slate-600 md:text-[17px] dark:text-slate-300" aria-live="off">
            <span className="font-semibold text-slate-900 dark:text-slate-100">{current.label}:</span> {current.text}
          </p>
          <div className="flex items-center gap-1">
            {/* os pontos também escolhem a tela (alvo de toque maior que as abas da réplica); o teclado e os leitores de tela usam as abas */}
            <div aria-hidden="true" className="flex items-center">
              {TABS.map((t, i) => (
                <button key={t.id} type="button" tabIndex={-1} onClick={() => control.onSelect(t.id)} className="flex h-10 w-7 items-center justify-center">
                  <span className={`h-2 rounded-full transition-all duration-300 ${i === active && revealed ? 'w-7 bg-blue-600' : 'w-2 bg-slate-300 dark:bg-slate-700'}`} />
                </button>
              ))}
            </div>
            {!reduced && (
              <button
                type="button"
                onClick={() => {
                  // retomar continua de onde estava: sem voltar a embaçar a janela no meio da tela
                  if (paused && !revealedRef.current) {
                    revealedRef.current = true
                    setRevealed(true)
                  }
                  setPaused((p) => !p)
                }}
                className="ml-2 flex h-10 items-center gap-1.5 rounded-full px-3 text-sm font-medium text-slate-600 hover:bg-slate-200 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-slate-100"
              >
                <svg width="12" height="12" viewBox="0 0 12 12" fill="currentColor" aria-hidden="true">
                  {paused ? <path d="M2.5 1.2v9.6L10.5 6z" /> : <path d="M2.5 1h2.6v10H2.5zM6.9 1h2.6v10H6.9z" />}
                </svg>
                {paused ? 'Continuar' : 'Pausar'}
              </button>
            )}
          </div>
        </div>
      </div>
    </section>
  )
}
