import { useState, type FormEvent } from 'react'
import { loginErrorMessage } from '../lib/authErrors'
import { supabase } from '../supabase'

export function Login({ notice = null, onBack }: { notice?: string | null; onBack?: () => void }) {
  const [mode, setMode] = useState<'signin' | 'signup'>('signin')
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
      if (mode === 'signin') {
        const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password })
        if (error) setMessage(loginErrorMessage(error))
      } else {
        const { data, error } = await supabase.auth.signUp({ email: email.trim(), password })
        if (error) setMessage(error.message.includes('already') ? 'Esse e-mail já tem conta. Use "Entrar".' : 'Não foi possível criar a conta.')
        else if (!data.session) setMessage('Conta criada. Confirme o e-mail que enviamos e depois entre.')
      }
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
      <p className="muted mb-6">{mode === 'signin' ? 'Entre para ver seus gastos.' : 'Crie sua conta para guardar seus gastos na nuvem.'}</p>
      <form onSubmit={handleSubmit} className="card space-y-3">
        <div>
          <label className="label" htmlFor="email">E-mail</label>
          <input id="email" type="email" autoComplete="email" required className="input" value={email} onChange={(e) => setEmail(e.target.value)} />
        </div>
        <div>
          <label className="label" htmlFor="password">Senha</label>
          <input id="password" type="password" autoComplete={mode === 'signin' ? 'current-password' : 'new-password'} required className="input" value={password} onChange={(e) => setPassword(e.target.value)} />
        </div>
        {message && <p role="alert" className="text-sm text-red-600 dark:text-red-400">{message}</p>}
        <button type="submit" className="btn-primary w-full" disabled={busy}>
          {busy ? 'Aguarde…' : mode === 'signin' ? 'Entrar' : 'Criar conta'}
        </button>
      </form>
      <button type="button" className="btn-ghost mt-3" onClick={() => { setMode(mode === 'signin' ? 'signup' : 'signin'); setMessage('') }}>
        {mode === 'signin' ? 'Primeira vez? Criar conta' : 'Já tenho conta. Entrar'}
      </button>
    </main>
  )
}
