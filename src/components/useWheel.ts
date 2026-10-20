import { useCallback, useEffect, useRef, useState } from 'react'
import { activeIndex, scrollTargetFor, wheelPosition, wheelProgress } from '../lib/wheel'

/** Quanto o desenho demora para alcançar a rolagem (constante de tempo, ms): menor = mais colado ao dedo. */
const TAU_MS = 70

/**
 * Liga uma seção alta (com conteúdo "sticky" dentro) à rolagem. Escreve `--p` (0 a 1) na seção a cada frame e
 * devolve o item em foco. Cada item para um instante no centro (`wheelPosition`) e o movimento desliza atrás da rolagem.
 */
export function useWheel(count: number) {
  const ref = useRef<HTMLElement>(null)
  const [active, setActive] = useState(0)

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
    }
    let lastFrame = 0 // instante do frame anterior, para o amortecimento depender do tempo e não da taxa de quadros
    const frame = (now: number) => {
      raf = 0
      const dt = lastFrame ? Math.min(now - lastFrame, 64) : 16
      lastFrame = now
      current += (target - current) * (1 - Math.exp(-dt / TAU_MS))
      if (Math.abs(target - current) < 0.0005) current = target
      draw()
      if (current !== target) raf = requestAnimationFrame(frame)
      else lastFrame = 0
    }
    const read = () => wheelPosition(wheelProgress(el.getBoundingClientRect().top, el.offsetHeight, window.innerHeight), count)
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
  }, [count])

  /** Rola a página até o ponto em que o item `index` fica em foco. */
  const goTo = useCallback(
    (index: number) => {
      const el = ref.current
      if (!el) return
      const top = scrollTargetFor(index, count, el.getBoundingClientRect().top + window.scrollY, el.offsetHeight, window.innerHeight)
      window.scrollTo({ top, behavior: 'smooth' })
    },
    [count],
  )

  return { ref, active, goTo }
}
