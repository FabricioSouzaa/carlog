// Tema do interior do app (depois do login). A landing e o login seguem só o sistema; aqui a pessoa escolhe: Sistema, Claro ou Escuro.
// A escolha fica neste aparelho. O tema "de fato" vira uma classe (`light` ou `dark`) no <html> enquanto o app está aberto.

export type ThemeChoice = 'system' | 'light' | 'dark'
export type Theme = 'light' | 'dark'

const KEY = 'carlog:theme'

export const THEME_LABEL: Record<ThemeChoice, string> = { system: 'Sistema', light: 'Claro', dark: 'Escuro' }

export const isThemeChoice = (v: unknown): v is ThemeChoice => v === 'system' || v === 'light' || v === 'dark'

/** "Sistema" segue o aparelho; as outras duas valem como estão. */
export const resolveTheme = (choice: ThemeChoice, systemDark: boolean): Theme => (choice === 'system' ? (systemDark ? 'dark' : 'light') : choice)

export function readThemeChoice(): ThemeChoice {
  try {
    const v = localStorage.getItem(KEY)
    return isThemeChoice(v) ? v : 'system'
  } catch {
    return 'system'
  }
}

export function saveThemeChoice(choice: ThemeChoice): void {
  try {
    localStorage.setItem(KEY, choice)
  } catch {
    // sem armazenamento (janela privada etc.): vale só até recarregar
  }
}

const darkQuery = () => (typeof window.matchMedia === 'function' ? window.matchMedia('(prefers-color-scheme: dark)') : null)

function paint(theme: Theme): void {
  const root = document.documentElement
  root.classList.remove('light', 'dark')
  root.classList.add(theme)
  root.style.colorScheme = theme
}

/**
 * Liga o tema no <html> e acompanha o aparelho quando a escolha é "Sistema".
 * Devolve `set` (troca a escolha na hora) e `stop` (tira as classes: a landing e o login voltam a seguir só o sistema).
 */
export function startTheme(initial: ThemeChoice = readThemeChoice()) {
  let choice = initial
  const mq = darkQuery()
  const apply = () => paint(resolveTheme(choice, mq?.matches ?? false))
  const onSystem = () => choice === 'system' && apply()
  mq?.addEventListener('change', onSystem)
  apply()
  return {
    set(next: ThemeChoice) {
      choice = next
      saveThemeChoice(next)
      apply()
    },
    stop() {
      mq?.removeEventListener('change', onSystem)
      document.documentElement.classList.remove('light', 'dark')
      document.documentElement.style.colorScheme = ''
    },
  }
}
