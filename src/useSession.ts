import type { Session } from '@supabase/supabase-js'
import { useEffect, useState } from 'react'
import { onPasswordRecovery, startupLink, supabase, supabaseConfigured } from './supabase'

// Quanto esperar pela confirmação de um link de recuperação (a URL indica que veio um) antes de seguir como login normal.
const RECOVERY_WAIT_MS = 1500

export function useSession() {
  const [session, setSession] = useState<Session | null>(null)
  const [sessionLoaded, setSessionLoaded] = useState(!supabaseConfigured)
  const [recovering, setRecovering] = useState(false)
  // a URL só é uma dica: segura a tela de carregamento até a biblioteca confirmar (ou o tempo acabar), sem piscar o app
  const [waitingRecovery, setWaitingRecovery] = useState(supabaseConfigured && startupLink.recovery)

  useEffect(() => {
    if (!supabaseConfigured) return
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session)
      setSessionLoaded(true)
    })
    const { data } = supabase.auth.onAuthStateChange((_event, next) => setSession(next))
    return () => data.subscription.unsubscribe()
  }, [])

  useEffect(() => {
    const off = onPasswordRecovery(() => {
      setRecovering(true)
      setWaitingRecovery(false)
    })
    const timer = window.setTimeout(() => setWaitingRecovery(false), RECOVERY_WAIT_MS)
    return () => {
      off()
      window.clearTimeout(timer)
    }
  }, [])

  /** Termina o fluxo de recuperação e limpa o código da URL. */
  const finishRecovery = () => {
    setRecovering(false)
    window.history.replaceState(null, '', window.location.pathname)
  }

  return { session, ready: sessionLoaded && !waitingRecovery, recovering, finishRecovery }
}
