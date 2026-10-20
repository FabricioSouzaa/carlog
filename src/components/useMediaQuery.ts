import { useSyncExternalStore } from 'react'

/** `true` enquanto a consulta de mídia (ex.: `(min-width: 640px)`) combina; acompanha mudanças de tamanho da janela. */
export function useMediaQuery(query: string): boolean {
  return useSyncExternalStore(
    (onChange) => {
      const mq = window.matchMedia(query)
      mq.addEventListener('change', onChange)
      return () => mq.removeEventListener('change', onChange)
    },
    () => window.matchMedia(query).matches,
    () => false,
  )
}
