import { useEffect, useState } from 'react'
import { delayAfter, TYPING_SPEED, TYPING_START } from '../lib/typing'

const reducedMotion = () => typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches

/**
 * Texto que aparece letra por letra, com um cursor piscando.
 * O texto inteiro já ocupa o lugar desde o início (a parte ainda não digitada fica invisível), então nada pula de lugar.
 * Leitores de tela leem o texto completo; com `prefers-reduced-motion` ele aparece pronto.
 */
export function Typewriter({ text, speed = TYPING_SPEED, startDelay = TYPING_START }: { text: string; speed?: number; startDelay?: number }) {
  const [reduced] = useState(reducedMotion) // lida uma vez, ao montar
  const [count, setCount] = useState(() => (reduced ? text.length : 0))
  const [caret, setCaret] = useState(!reduced)

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
    <span>
      <span className="sr-only">{text}</span>
      <span aria-hidden="true">
        {text.slice(0, count)}
        {caret && (
          // caixa sem largura, com altura de uma linha de letras, descendo um pouco abaixo da linha de base (como o texto)
          <span className="relative inline-block h-[0.9em] w-0 align-[-0.08em]">
            <span className="caret absolute inset-y-0 left-[0.04em] w-[0.07em] bg-current" />
          </span>
        )}
        <span className="invisible">{text.slice(count)}</span>
      </span>
    </span>
  )
}
