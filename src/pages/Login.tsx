import { useEffect, useState, type FormEvent } from 'react'
import { Logo } from '../components/Logo'
import { ACCESS_MESSAGE, ACCESS_WHATSAPP, APP_NAME, APP_SLOGAN } from '../config'
import { loginErrorMessage, RECOVERY_SENT, recoveryErrorMessage } from '../lib/authErrors'
import { whatsappLink } from '../lib/whatsapp'
import { supabase } from '../supabase'

export function Login({ notice = null, onBack }: { notice?: string | null; onBack?: () => void }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState(notice ?? '')
  const [info, setInfo] = useState('')
  const [cooling, setCooling] = useState(false) // botão de recuperação travado por 60 s depois de um envio (só nesta tela; o Supabase também limita no servidor)

  useEffect(() => {
    if (!cooling) return
    const timer = window.setTimeout(() => setCooling(false), 60_000)
    return () => window.clearTimeout(timer)
  }, [cooling])

  function changeEmail(value: string) {
    setEmail(value)
    // outro e-mail = outro pedido: some a confirmação do anterior e o botão volta a funcionar
    setInfo('')
    setCooling(false)
  }

  async function handleForgot() {
    setMessage('')
    setInfo('')
    if (!email.trim()) return setMessage('Digite seu e-mail acima e toque em "Esqueci minha senha".')
    if (!/^\S+@\S+\.\S+$/.test(email.trim())) return setMessage(recoveryErrorMessage({ code: 'email_address_invalid' }))
    setBusy(true)
    try {
      // a resposta é a mesma exista a conta ou não (o Supabase também não revela); o cadastro público segue fechado
      const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), { redirectTo: `${window.location.origin}/` })
      if (error) return setMessage(recoveryErrorMessage(error))
      setInfo(RECOVERY_SENT)
      setCooling(true)
    } catch {
      setMessage(recoveryErrorMessage({ status: 0 }))
    } finally {
      setBusy(false)
    }
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setMessage('')
    setInfo('')
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
          <p className="font-display text-4xl leading-tight font-bold tracking-tight">{APP_SLOGAN}</p>
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
              <input id="email" type="email" autoComplete="email" placeholder="voce@email.com" required className="input !py-3" value={email} onChange={(e) => changeEmail(e.target.value)} />
            </div>
            <div>
              <div className="mb-1 flex items-center justify-between gap-3">
                <label className="label !mb-0" htmlFor="password">Senha</label>
                <button
                  type="button"
                  className="btn-outline !px-2.5 !py-1 !text-xs"
                  onClick={handleForgot}
                  disabled={busy || cooling}
                  title={cooling ? 'Link enviado. Aguarde um minuto para pedir outro.' : undefined}
                >
                  Esqueci minha senha
                </button>
              </div>
              <div className="relative">
                <input id="password" type={showPassword ? 'text' : 'password'} autoComplete="current-password" required className="input !py-3 !pr-20" value={password} onChange={(e) => setPassword(e.target.value)} />
                <button
                  type="button"
                  className="absolute inset-y-0 right-0 px-3.5 text-[13px] font-medium text-blue-600 hover:text-blue-700 dark:text-blue-400"
                  aria-controls="password"
                  onClick={() => setShowPassword((v) => !v)}
                >
                  {showPassword ? 'Ocultar' : 'Mostrar'}
                </button>
              </div>
            </div>
            {info && <p role="status" className="text-sm text-green-700 dark:text-green-400">{info}</p>}
            {message && <p role="alert" className="text-sm text-red-600 dark:text-red-400">{message}</p>}
            <button
              type="submit"
              className="btn-primary w-full !rounded-xl !py-3.5 !text-base !font-semibold bg-linear-to-b from-blue-500 to-blue-700 shadow-md shadow-blue-600/30 transition-all hover:from-blue-600 hover:to-blue-800 hover:shadow-lg active:translate-y-px active:shadow-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500"
              disabled={busy}
            >
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
