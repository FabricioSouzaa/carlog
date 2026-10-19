import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react'

/**
 * Faz o conteúdo entrar (sobe e aparece) quando chega à tela ao rolar. Só anima uma vez.
 * Sem IntersectionObserver o conteúdo aparece direto, e `prefers-reduced-motion` desliga o movimento (ver index.css).
 * Os filhos com `.bar-y` / `.bar-x` crescem junto, com atraso por `--i`.
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
      { threshold: 0.15, rootMargin: '0px 0px -6% 0px' },
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
