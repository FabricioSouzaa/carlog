import type { Session } from '@supabase/supabase-js'
import { useEffect, useState } from 'react'
import { clearPasswordRecovery, onPasswordRecovery, startupLink, supabase, supabaseConfigured } from './supabase'

// Depois que a biblioteca termina de iniciar (inclusive a troca do código do link, que depende da rede), o evento
// PASSWORD_RECOVERY já está na fila do navegador: esta folga curta só deixa ele chegar antes de mostrar o app.
const RECOVERY_GRACE_MS = 100

export function useSession() {
  const [session, setSession] = useState<Session | null>(null)
  const [sessionLoaded, setSessionLoaded] = useState(!supabaseConfigured)
  const [recovering, setRecovering] = useState(false)
  // a URL só é uma dica: segura a tela de carregamento até a biblioteca confirmar (ou terminar de iniciar sem evento), sem piscar o app
  const [waitingRecovery, setWaitingRecovery] = useState(supabaseConfigured && startupLink.recovery)

  useEffect(() => {
    if (!supabaseConfigured) return
    let grace: number | undefined
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session)
      setSessionLoaded(true)
      grace = window.setTimeout(() => setWaitingRecovery(false), RECOVERY_GRACE_MS)
    })
    const { data } = supabase.auth.onAuthStateChange((_event, next) => setSession(next))
    return () => {
      data.subscription.unsubscribe()
      window.clearTimeout(grace)
    }
  }, [])

  useEffect(() => {
    const off = onPasswordRecovery(() => {
      setRecovering(true)
      setWaitingRecovery(false)
    })
    return off
  }, [])

  /** Termina o fluxo de recuperação e limpa o código da URL. */
  const finishRecovery = () => {
    setRecovering(false)
    clearPasswordRecovery()
    window.history.replaceState(null, '', window.location.pathname)
  }

  return { session, ready: sessionLoaded && !waitingRecovery, recovering, finishRecovery }
}
