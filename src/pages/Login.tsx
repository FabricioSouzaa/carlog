import { useState, type FormEvent } from 'react'
import { Logo } from '../components/Logo'
import { ACCESS_MESSAGE, ACCESS_WHATSAPP, APP_NAME } from '../config'
import { loginErrorMessage } from '../lib/authErrors'
import { whatsappLink } from '../lib/whatsapp'
import { supabase } from '../supabase'

export function Login({ notice = null, onBack }: { notice?: string | null; onBack?: () => void }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
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
          <p className="font-display text-4xl leading-tight font-bold tracking-tight">Cada real do seu carro, no lugar certo.</p>
          <p className="mt-3 text-slate-300">Registre cada gasto, planeje o que vem pela frente e veja para onde vai o seu dinheiro.</p>
        </div>
      </aside>
      <main className="flex flex-col justify-center p-6 md:p-12">
        <div className="mx-auto w-full max-w-sm">
          {onBack && <button type="button" className="btn-ghost -ml-3 mb-6" onClick={onBack}>← Voltar</button>}
          <h1 className="font-display text-4xl leading-tight font-bold tracking-tight">Bem-vindo de volta</h1>
          <p className="muted mt-2 mb-7 !text-[15px]">Entre no {APP_NAME} para ver seus gastos e planejar os próximos.</p>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="label" htmlFor="email">E-mail</label>
              <input id="email" type="email" autoComplete="email" placeholder="voce@email.com" required className="input !py-3" value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>
            <div>
              <label className="label" htmlFor="password">Senha</label>
              <div className="relative">
                <input id="password" type={showPassword ? 'text' : 'password'} autoComplete="current-password" required className="input !py-3 !pr-20" value={password} onChange={(e) => setPassword(e.target.value)} />
                <button
                  type="button"
                  className="absolute inset-y-0 right-0 px-3.5 text-[13px] font-medium text-blue-600 hover:text-blue-700 dark:text-blue-400"
                  aria-pressed={showPassword}
                  onClick={() => setShowPassword((v) => !v)}
                >
                  {showPassword ? 'Ocultar' : 'Mostrar'}
                </button>
              </div>
            </div>
            {message && <p role="alert" className="text-sm text-red-600 dark:text-red-400">{message}</p>}
            <button type="submit" className="btn-primary w-full !py-3 !text-base !font-semibold" disabled={busy}>
              {busy ? 'Aguarde…' : 'Entrar'}
            </button>
          </form>
          {/* o cadastro público está desativado: quem não tem conta pede acesso pelo WhatsApp */}
          <div className="my-6 flex items-center gap-3 text-[13px] text-slate-400 dark:text-slate-500">
            <span className="h-px flex-1 bg-slate-200 dark:bg-slate-800" />
            ainda não tem conta?
            <span className="h-px flex-1 bg-slate-200 dark:bg-slate-800" />
          </div>
          <a href={whatsappLink(ACCESS_WHATSAPP, ACCESS_MESSAGE)} target="_blank" rel="noopener noreferrer" className="btn-outline w-full !py-3 !text-[15px] !font-semibold">
            <span aria-hidden="true" className="mr-2.5 inline-block h-2.5 w-2.5 rounded-full bg-green-500" />
            Pedir acesso pelo WhatsApp
          </a>
        </div>
      </main>
    </div>
  )
}
