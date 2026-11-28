import { useCallback, useLayoutEffect, useRef, useState } from 'react'
import { readThemeChoice, startTheme, type ThemeChoice } from './lib/theme'

/** Liga o tema do app (classe no <html>) enquanto o componente existe e devolve a escolha atual e como trocá-la. */
export function useTheme() {
  const [choice, setChoice] = useState<ThemeChoice>(readThemeChoice)
  const controller = useRef<ReturnType<typeof startTheme> | null>(null)

  // antes da primeira pintura: sem isso o app piscaria na paleta "clássica" antes de trocar para Areia ou Marinho
  useLayoutEffect(() => {
    const c = startTheme(readThemeChoice())
    controller.current = c
    document.body.classList.add('app-shell')
    return () => {
      c.stop()
      controller.current = null
      document.body.classList.remove('app-shell')
    }
  }, [])

  const change = useCallback((next: ThemeChoice) => {
    setChoice(next)
    controller.current?.set(next)
  }, [])

  return { choice, change }
}

export type ThemeApi = ReturnType<typeof useTheme>
