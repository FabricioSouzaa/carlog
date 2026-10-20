import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react'

/**
 * Faz o conteúdo entrar (sobe e aparece) quando chega à tela ao rolar. Só anima uma vez.
 * Sem IntersectionObserver o conteúdo aparece direto, e `prefers-reduced-motion` desliga o movimento (ver index.css).
 * Dentro dele, `RevealItem` e as barras (`.bar-y` / `.bar-x`) entram em sequência, com atraso por `--i`.
 */
export function Reveal({ children, delay = 0, className = '' }: { children: ReactNode; delay?: number; className?: string }) {
  const ref = useRef<HTMLDivElement>(null)
  const [visible, setVisible] = useState(() => typeof IntersectionObserver === 'undefined')

  useEffect(() => {
    const el = ref.current
    if (!el || visible) return
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true)
          io.disconnect()
        }
      },
      { threshold: 0, rootMargin: '0px 0px -8% 0px' },
    )
    io.observe(el)
    return () => io.disconnect()
  }, [visible])

  return (
    <div ref={ref} data-visible={visible} style={{ '--reveal-delay': `${delay}ms` } as CSSProperties} className={`reveal ${className}`}>
      {children}
    </div>
  )
}

/** Parte de um bloco `Reveal` que entra depois dele, em sequência (`i` = posição na fila). */
export function RevealItem({ i = 0, children, className = '' }: { i?: number; children: ReactNode; className?: string }) {
  return (
    <div className={`reveal-item ${className}`} style={{ '--i': i } as CSSProperties}>
      {children}
    </div>
  )
}
