import { useEffect, useState } from 'react'
import { delayAfter } from '../lib/typing'

const reducedMotion = () => typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches

/**
 * Texto que aparece letra por letra, com um cursor piscando.
 * O texto inteiro já ocupa o lugar desde o início (a parte ainda não digitada fica invisível), então nada pula de lugar.
 * Leitores de tela leem o texto completo; com `prefers-reduced-motion` ele aparece pronto.
 */
export function Typewriter({ text, speed = 48, startDelay = 500 }: { text: string; speed?: number; startDelay?: number }) {
  const [count, setCount] = useState(() => (reducedMotion() ? text.length : 0))
  const [caret, setCaret] = useState(() => !reducedMotion())

  useEffect(() => {
    if (count >= text.length) {
      // o cursor ainda pisca um instante depois de terminar
      const t = setTimeout(() => setCaret(false), 1600)
      return () => clearTimeout(t)
    }
    const wait = count === 0 ? startDelay : delayAfter(text[count - 1], speed)
    const t = setTimeout(() => setCount((c) => c + 1), wait)
    return () => clearTimeout(t)
  }, [count, text, speed, startDelay])

  return (
    <span aria-label={text}>
      <span aria-hidden="true">
        {text.slice(0, count)}
        {caret && (
          <span className="relative inline-block w-0">
            <span className="caret absolute top-[0.12em] left-[0.04em] h-[0.82em] w-[0.07em] bg-current" />
          </span>
        )}
        <span className="invisible">{text.slice(count)}</span>
      </span>
    </span>
  )
}
