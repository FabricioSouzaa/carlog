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
const START_MS = 500 // espera antes do primeiro movimento, depois que a janela aparece

const Arrow = () => (
  <svg width="30" height="30" viewBox="0 0 24 24" fill="none" aria-hidden="true" className="drop-shadow-md">
    <path d="M5 3l14 8-6 2 4 7-3 1-4-7-5 4z" fill="#0f172a" stroke="#fff" strokeWidth="1.6" strokeLinejoin="round" />
  </svg>
)

/**
 * "Tudo em um só lugar": uma janela do app em que um cursor clica sozinho em cada aba (no celular, um toque), em loop. É uma animação
 * por TEMPO e não presa à rolagem (as seções 3 e 4 já são): roda só enquanto a janela está na tela, e a pessoa pode clicar numa aba
 * (assume o controle e o automático pára) ou pausar. Com `prefers-reduced-motion` não anda sozinha; as abas continuam clicáveis.
 * As telas são as réplicas de `AppScreens`; as abas delas são as do próprio desenho, tornadas clicáveis por `TabsControlProvider`.
 */
export function FeatureTabs() {
  const stage = useRef<HTMLDivElement>(null)
  const tabEls = useRef(new Map<TabId, HTMLElement>())
  const activeRef = useRef(0)
  const targetRef = useRef(0) // aba para onde o cursor aponta (para reapontar se a tela mudar de tamanho)
  const [active, setActive] = useState(0)
  const [paused, setPaused] = useState(false)
  const [visible, setVisible] = useState(false)
  const [cursor, setCursor] = useState({ x: 520, y: 330, shown: false })
  const [press, setPress] = useState(0)
  const [reached, setReached] = useState(0) // última aba que o cursor já clicou neste ciclo; as seguintes aparecem foscas
  const reduced = useMediaQuery('(prefers-reduced-motion: reduce)')
  const touch = useMediaQuery('(hover: none)')
  const playing = visible && !paused && !reduced

  const select = useCallback((i: number) => {
    activeRef.current = i
    setActive(i)
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

  // estável: só muda quando uma aba é destravada (e não a cada passo da animação), senão a janela inteira renderizaria de novo
  const control = useMemo<TabsControl>(
    () => ({
      onSelect: (id) => {
        select(TABS.findIndex((t) => t.id === id))
        setPaused(true) // clicar numa aba é assumir o controle: o automático pára
      },
      setTabEl: (id, el) => {
        if (el) tabEls.current.set(id, el)
        else tabEls.current.delete(id)
      },
      focusTab: (id) => tabEls.current.get(id)?.focus(),
      locked,
    }),
    [select, locked],
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

  // só anima enquanto a janela está (quase toda) na tela
  useEffect(() => {
    const el = stage.current
    if (!el || typeof IntersectionObserver === 'undefined') return
    // 0,3 e não mais: numa tela baixa (celular deitado, zoom grande) a janela inteira nunca chegaria a 60% visível e a demonstração não começaria
    const io = new IntersectionObserver(([entry]) => setVisible(entry.isIntersecting), { threshold: 0.3 })
    io.observe(el)
    return () => io.disconnect()
  }, [])

  // o roteiro: o cursor aparece na aba atual, desliza até a próxima, clica, a tela troca, espera, e segue (em loop)
  useEffect(() => {
    if (!playing) return
    const timers: number[] = []
    const at = (ms: number, fn: () => void) => void timers.push(window.setTimeout(fn, ms))
    let next = (activeRef.current + 1) % TABS.length
    const step = () => {
      point(next)
      at(MOVE_MS, () => setPress((n) => n + 1))
      at(MOVE_MS + CLICK_LEAD_MS, () => {
        const clicked = next
        select(clicked)
        setReached(clicked) // acende a aba clicada; ao dar a volta (clicou a primeira), as outras apagam de novo e o ciclo recomeça
        next = (next + 1) % TABS.length
      })
      at(MOVE_MS + CLICK_LEAD_MS + DWELL_MS, step)
    }
    at(40, () => {
      point(activeRef.current) // o cursor aparece sobre a aba atual
      setReached(activeRef.current)
    })
    at(START_MS, step)
    return () => timers.forEach((t) => window.clearTimeout(t))
  }, [playing, point, select])

  const current = TABS[active]
  return (
    <section id="tudo" aria-labelledby="abas" className="bg-slate-50 px-4 py-20 md:py-28 dark:bg-slate-950">
      <div className="mx-auto max-w-3xl text-center">
        <p className="text-[13px] font-semibold tracking-[0.18em] text-blue-600 uppercase dark:text-blue-400">O sistema</p>
        <h2 id="abas" className="font-display mt-2 text-4xl leading-[1.08] font-bold tracking-tight md:text-5xl">Tudo em um só lugar</h2>
        <p className="muted mt-3 !text-base md:!text-[17px]">Quatro telas, uma para cada parte da vida do seu carro.</p>
      </div>

      <div className="mx-auto mt-10 w-full max-w-[820px]">
        <div ref={stage} className="relative">
          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_24px_60px_rgba(15,23,42,0.14)] dark:border-slate-800 dark:bg-slate-900">
            <TabsControlProvider value={control}>
              <FitScreen screen={current.id} />
            </TabsControlProvider>
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
                  <span className={`h-2 rounded-full transition-all duration-300 ${i === active ? 'w-7 bg-blue-600' : 'w-2 bg-slate-300 dark:bg-slate-700'}`} />
                </button>
              ))}
            </div>
            {!reduced && (
              <button
                type="button"
                onClick={() => setPaused((p) => !p)}
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
