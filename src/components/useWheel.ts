import { useCallback, useEffect, useRef, useState } from 'react'
import { activeIndex, scrollTargetFor, weightedPosition, wheelPosition, wheelProgress } from '../lib/wheel'

/**
 * Liga uma seção alta (com conteúdo "sticky" dentro) à rolagem. Escreve `--p` (0 a 1) na seção a cada frame e
 * devolve o item em foco. Cada item para um instante no centro (`wheelPosition`) e o movimento desliza atrás da rolagem.
 */
export function useWheel(
  count: number,
  {
    tau = 70,
    dwell,
    weights,
    staticPosition = 0,
    onPosition,
  }: {
    /** Quanto o desenho demora para alcançar a rolagem (constante de tempo, ms): menor = mais colado ao dedo. */
    tau?: number
    /** Fração do trecho em que cada item fica parado (ver `wheelPosition`). */
    dwell?: number
    /** Peso de cada trecho entre itens (trechos mais pesados ganham mais rolagem). Padrão: todos iguais. Use uma constante: muda o efeito se trocar a cada render. */
    weights?: number[]
    /** Posição usada quando a seção é só uma lista comum (movimento reduzido ou sem suporte). */
    staticPosition?: number
    /** Chamado a cada frame com a posição desenhada (em itens), para cenas que dependem dela. */
    onPosition?: (position: number) => void
  } = {},
) {
  const ref = useRef<HTMLElement>(null)
  const [active, setActive] = useState(0)
  const onPositionRef = useRef(onPosition)
  useEffect(() => {
    onPositionRef.current = onPosition
  })

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const last = Math.max(1, count - 1)
    let target = 0 // posição pedida pela rolagem (em itens)
    let current = 0 // posição desenhada: vai atrás da pedida, para o movimento deslizar
    let raf = 0
    const draw = () => {
      el.style.setProperty('--p', (current / last).toFixed(4))
      setActive(activeIndex(current, count))
      onPositionRef.current?.(current)
    }
    let lastFrame = 0 // instante do frame anterior, para o amortecimento depender do tempo e não da taxa de quadros
    const frame = (now: number) => {
      raf = 0
      const dt = lastFrame ? Math.min(now - lastFrame, 64) : 16
      lastFrame = now
      current += (target - current) * (1 - Math.exp(-dt / tau))
      if (Math.abs(target - current) < 0.0005) current = target
      draw()
      if (current !== target) raf = requestAnimationFrame(frame)
      else lastFrame = 0
    }
    // a "janela" é a altura do conteúdo fixo (100dvh), não window.innerHeight: nos celulares os dois mudam em
    // momentos diferentes quando a barra de endereço some, e a conta desencontrava nas pontas
    const stage = el.firstElementChild as HTMLElement | null
    // sem o seletor (movimento reduzido ou sem suporte) a seção é uma lista comum e não há o que acompanhar
    const pinned = () => !!stage && getComputedStyle(stage).position === 'sticky'
    const read = () => {
      if (!pinned()) return staticPosition
      const p = wheelProgress(el.getBoundingClientRect().top, el.offsetHeight, stage!.offsetHeight)
      return weights ? weightedPosition(p, weights, dwell) : wheelPosition(p, count, dwell)
    }
    const onScroll = () => {
      target = read()
      if (!raf) raf = requestAnimationFrame(frame)
    }
    target = current = read() // ao carregar, já na posição certa (sem deslizar)
    draw()
    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', onScroll)
    return () => {
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', onScroll)
      if (raf) cancelAnimationFrame(raf)
    }
  }, [count, tau, dwell, weights, staticPosition])

  /** Rola a página até o ponto em que o item `index` fica em foco. */
  const goTo = useCallback(
    (index: number) => {
      const el = ref.current
      const stage = el?.firstElementChild as HTMLElement | null
      if (!el || !stage) return
      const top = scrollTargetFor(index, count, el.getBoundingClientRect().top + window.scrollY, el.offsetHeight, stage.offsetHeight, weights)
      window.scrollTo({ top, behavior: 'smooth' })
    },
    [count, weights],
  )

  return { ref, active, goTo }
}
