import { useState, type FormEvent } from 'react'
import { Logo } from '../components/Logo'
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
    <div className="min-h-dvh md:grid md:grid-cols-2">
      {/* metade da tela com a marca; no celular vira uma faixa no topo */}
      <aside className="flex flex-col items-center justify-center gap-10 bg-linear-to-b from-slate-900 to-blue-700 px-8 py-6 text-center text-white md:min-h-dvh md:px-16">
        <Logo tile={false} size={288} className="h-24 w-24 md:h-72 md:w-72" />
        <div className="hidden max-w-md md:block">
          <p className="text-3xl leading-tight font-bold">Saiba quanto o seu carro realmente custa</p>
          <p className="mt-3 text-slate-300">Registre gastos, planeje os próximos e tenha o histórico do carro no celular e no computador.</p>
        </div>
      </aside>
      <main className="flex flex-col justify-center p-6 md:p-12">
        <div className="mx-auto w-full max-w-sm">
          {onBack && <button type="button" className="btn-ghost -ml-3 mb-4" onClick={onBack}>← Voltar</button>}
          <h1 className="mb-1 flex items-center gap-2.5 text-2xl font-bold">
            <Logo size={36} />
            Histórico do Carro
          </h1>
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
          <a href={whatsappLink(ACCESS_WHATSAPP, ACCESS_MESSAGE)} target="_blank" rel="noopener noreferrer" className="btn-ghost -ml-3 mt-3">
            Primeira vez? Solicitar acesso pelo WhatsApp
          </a>
        </div>
      </main>
    </div>
  )
}
