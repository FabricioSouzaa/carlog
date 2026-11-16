import { createClient } from '@supabase/supabase-js'
import { parseAuthLink } from './lib/authLink'
import { cleanEnv } from './lib/env'

const url = cleanEnv(import.meta.env.VITE_SUPABASE_URL as string | undefined)
const anonKey = cleanEnv(import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined)

// O cliente apaga o hash da URL ao processar o link do e-mail, então lemos antes de criá-lo.
export const startupLink = typeof window === 'undefined' ? { recovery: false, error: null } : parseAuthLink(window.location.hash, window.location.search)
export const supabaseConfigured = Boolean(url && anonKey)

// Sem as variáveis o app mostra uma tela de configuração (ver App.tsx) em vez de quebrar.
export const supabase = createClient(url ?? 'http://localhost', anonKey ?? 'missing-key')

// O evento PASSWORD_RECOVERY é disparado pela biblioteca logo depois de validar o link do e-mail, possivelmente antes de
// o React montar. Por isso ouvimos aqui, na criação do cliente, e guardamos: a tela de "nova senha" só abre com esse
// evento (link realmente validado), não por causa de um `type=recovery` solto na URL.
let recoveryConfirmed = false
const recoveryListeners = new Set<() => void>()
if (supabaseConfigured) {
  supabase.auth.onAuthStateChange((event) => {
    if (event !== 'PASSWORD_RECOVERY') return
    recoveryConfirmed = true
    recoveryListeners.forEach((fn) => fn())
  })
}

/** Encerra o fluxo de recuperação: uma nova montagem do app não reabre a tela de nova senha. */
export function clearPasswordRecovery(): void {
  recoveryConfirmed = false
}

/** Chama `fn` quando a recuperação de senha for confirmada (na hora, se já foi). Devolve a função que cancela. */
export function onPasswordRecovery(fn: () => void): () => void {
  if (recoveryConfirmed) fn()
  recoveryListeners.add(fn)
  return () => void recoveryListeners.delete(fn)
}

