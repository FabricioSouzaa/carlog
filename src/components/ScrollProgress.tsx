import { useEffect, useRef } from 'react'
import { scrollProgress } from '../lib/scroll'

/**
 * Linha fina no topo da tela que vai de 0 a 100% conforme a página é rolada, do hero ao rodapé.
 * Mostra que há mais conteúdo e onde a pessoa está. Só é decorativa (os leitores de tela ignoram).
 * Escreve direto no estilo (sem estado do React) para não renderizar a cada pixel.
 */
export function ScrollProgress() {
  const bar = useRef<HTMLDivElement>(null)

  useEffect(() => {
    let frame = 0
    const update = () => {
      frame = 0
      const el = document.documentElement
      bar.current?.style.setProperty('--progress', String(scrollProgress(window.scrollY, el.scrollHeight, window.innerHeight)))
    }
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(update)
    }
    update()
    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', onScroll)
    // a altura da página muda quando as fontes e as seções fixas terminam de carregar
    const observer = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(onScroll)
    observer?.observe(document.documentElement)
    return () => {
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', onScroll)
      observer?.disconnect()
      if (frame) cancelAnimationFrame(frame)
    }
  }, [])

  return (
    <div aria-hidden="true" className="pointer-events-none fixed inset-x-0 top-0 z-50 h-[3px]">
      <div ref={bar} className="scroll-progress h-full origin-left bg-linear-to-r from-blue-500 to-sky-300" />
    </div>
  )
}
