import { useState, type FormEvent } from 'react'
import { ACCESS_MESSAGE, ACCESS_WHATSAPP } from '../config'
import { loginErrorMessage } from '../lib/authErrors'
import { whatsappLink } from '../lib/whatsapp'
import { supabase } from '../supabase'

export function Login({ notice = null, onBack }: { notice?: string | null; onBack?: () => void }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState(notice ?? '')

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setMessage('')
    if (password.length < 6) return setMessage('A senha precisa ter pelo menos 6 caracteres.')
    setBusy(true)
    try {
      const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password })
      if (error) setMessage(loginErrorMessage(error))
    } catch {
      setMessage('Não foi possível falar com o servidor. Verifique a conexão e tente novamente.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <main className="mx-auto flex min-h-dvh max-w-sm flex-col justify-center p-6">
      {onBack && <button type="button" className="btn-ghost mb-4 self-start" onClick={onBack}>← Voltar</button>}
      <h1 className="mb-1 text-2xl font-bold">🚗 Histórico do Carro</h1>
      <p className="muted mb-6">Entre para ver seus gastos.</p>
      <form onSubmit={handleSubmit} className="card space-y-3">
        <div>
          <label className="label" htmlFor="email">E-mail</label>
          <input id="email" type="email" autoComplete="email" required className="input" value={email} onChange={(e) => setEmail(e.target.value)} />
        </div>
        <div>
          <label className="label" htmlFor="password">Senha</label>
          <input id="password" type="password" autoComplete="current-password" required className="input" value={password} onChange={(e) => setPassword(e.target.value)} />
        </div>
        {message && <p role="alert" className="text-sm text-red-600 dark:text-red-400">{message}</p>}
        <button type="submit" className="btn-primary w-full" disabled={busy}>
          {busy ? 'Aguarde…' : 'Entrar'}
        </button>
      </form>
      {/* o cadastro público está desativado: quem não tem conta pede acesso pelo WhatsApp */}
      <a href={whatsappLink(ACCESS_WHATSAPP, ACCESS_MESSAGE)} target="_blank" rel="noopener noreferrer" className="btn-ghost mt-3">
        Primeira vez? Solicitar acesso pelo WhatsApp
      </a>
    </main>
  )
}
