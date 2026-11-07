import { lazy, Suspense, startTransition, useEffect, useState } from 'react'
import { startupLink, supabaseConfigured } from './supabase'
import { ErrorBoundary } from './components/ErrorBoundary'
import { Logo } from './components/Logo'
import { APP_NAME } from './config'
import { useSession } from './useSession'
import { useData } from './useData'

// as telas de quem ainda não entrou (landing, login, redefinir senha) são pedaços separados do app: quem já tem sessão nunca baixa a landing
// (a mais pesada, por causa das animações), e quem só visita a landing não baixa o app. Cada aba também é um pedaço, baixado só quando é aberta.
const loadLanding = () => import('./pages/Landing').then((m) => ({ default: m.Landing }))
const loadLogin = () => import('./pages/Login').then((m) => ({ default: m.Login }))
const loadResetPassword = () => import('./pages/ResetPassword').then((m) => ({ default: m.ResetPassword }))
const loadVisaoGeral = () => import('./pages/VisaoGeral').then((m) => ({ default: m.VisaoGeral }))
const loadGastos = () => import('./pages/Gastos').then((m) => ({ default: m.Gastos }))
const loadPlanejados = () => import('./pages/Planejados').then((m) => ({ default: m.Planejados }))
const loadAjustes = () => import('./pages/Ajustes').then((m) => ({ default: m.Ajustes }))
const loadGaleria = () => import('./pages/Galeria').then((m) => ({ default: m.Galeria }))
const loadMonthlyBars = () => import('./components/MonthlyBars')

// quem chega pelo link de redefinição de senha já sabe, ao abrir, que vai precisar desta tela: o download começa na hora
if (startupLink.recovery) void loadResetPassword().catch(() => {})

const Landing = lazy(loadLanding)
const Login = lazy(loadLogin)
const ResetPassword = lazy(loadResetPassword)
const VisaoGeral = lazy(loadVisaoGeral)
const Gastos = lazy(loadGastos)
const Planejados = lazy(loadPlanejados)
const Ajustes = lazy(loadAjustes)
const Galeria = lazy(loadGaleria)

/**
 * Roda `fn` quando o navegador está ocioso (no máximo em 3 s, mesmo com a página ocupada; onde não há `requestIdleCallback`, em 2 s).
 * Devolve a função que cancela, para quem sai da tela antes de ela rodar.
 */
function whenIdle(fn: () => void): () => void {
  if ('requestIdleCallback' in window) {
    const id = window.requestIdleCallback(fn, { timeout: 3000 })
    return () => window.cancelIdleCallback(id)
  }
  const id = setTimeout(fn, 2000)
  return () => clearTimeout(id)
}

/** Baixa os pedaços em segundo plano para a primeira abertura de cada aba já encontrá-los prontos. */
function prefetchPages() {
  // a Visão geral é a aba inicial: começa já, em paralelo com o carregamento dos dados
  void loadVisaoGeral().catch(() => {})
  void loadMonthlyBars().catch(() => {})
  whenIdle(() => {
    for (const load of [loadGastos, loadPlanejados, loadAjustes, loadGaleria]) void load().catch(() => {})
  })
}

const TABS = [
  { id: 'visao', label: 'Visão geral', icon: '📊' },
  { id: 'gastos', label: 'Gastos', icon: '🧾' },
  { id: 'planejados', label: 'Planejados', icon: '🗓️' },
  { id: 'ajustes', label: 'Ajustes', icon: '⚙️' },
] as const

type TabId = (typeof TABS)[number]['id']

const Loading = ({ className = 'p-6' }: { className?: string }) => <p className={`${className} text-center muted`}>Carregando…</p>
const SCREEN_ERROR = 'Não foi possível carregar esta tela. Verifique a internet e tente de novo.'

function MissingConfig() {
  return (
    <main className="mx-auto max-w-md p-6">
      <h1 className="mb-2 text-xl font-bold">Falta configurar o Supabase</h1>
      <p className="muted">
        Crie o arquivo <code>.env.local</code> na raiz do projeto (veja <code>.env.local.example</code>) com{' '}
        <code>VITE_SUPABASE_URL</code> e <code>VITE_SUPABASE_ANON_KEY</code> e reinicie o <code>npm run dev</code>.
      </p>
    </main>
  )
}

export default function App() {
  const { session, ready, recovering, finishRecovery } = useSession()
  // quem chega por um link de e-mail com erro vai direto ao login, onde o aviso aparece
  const [showLogin, setShowLogin] = useState(Boolean(startupLink.error))
  const loggedOut = ready && !session
  // quem está na landing provavelmente vai clicar em "Entrar": o login é baixado nos bastidores, para abrir na hora
  useEffect(() => {
    if (!loggedOut) return undefined
    return whenIdle(() => void loadLogin().catch(() => {})) // cancela se a pessoa entrar antes: quem está logado não precisa do login
  }, [loggedOut])
  if (!supabaseConfigured) return <MissingConfig />
  if (!ready) return <Loading />
  if (!session) {
    // em transição, a landing continua na tela até o login chegar (sem trocar por "Carregando…"); o ErrorBoundary evita a tela em branco se o download falhar
    return (
      <ErrorBoundary key={showLogin ? 'login' : 'landing'} message={SCREEN_ERROR}>
        <Suspense fallback={<Loading />}>
          {showLogin ? (
            <Login notice={startupLink.error} onBack={() => startTransition(() => setShowLogin(false))} />
          ) : (
            <Landing onLogin={() => startTransition(() => setShowLogin(true))} />
          )}
        </Suspense>
      </ErrorBoundary>
    )
  }
  if (recovering) {
    return (
      <ErrorBoundary message={SCREEN_ERROR}>
        <Suspense fallback={<Loading />}>
          <ResetPassword onDone={finishRecovery} />
        </Suspense>
      </ErrorBoundary>
    )
  }
  return <Main email={session.user.email ?? ''} />
}

function Main({ email }: { email: string }) {
  const api = useData()
  const [tab, setTabNow] = useState<TabId | 'galeria'>('visao')
  // em transição, a tela atual continua visível até o pedaço da aba nova chegar (sem piscar "Carregando…")
  const setTab = (t: TabId | 'galeria') => startTransition(() => setTabNow(t))

  useEffect(prefetchPages, [])

  return (
    <div className="min-h-dvh">
      {/* no celular o nome do app não cabe na barra de baixo: fica numa barra fina no topo */}
      <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 px-4 backdrop-blur md:hidden dark:border-slate-800 dark:bg-slate-900/95">
        <button
          type="button"
          onClick={() => setTab('galeria')}
          aria-label={`${APP_NAME}: abrir fotos do carro`}
          aria-current={tab === 'galeria' ? 'page' : undefined}
          className={`flex items-center gap-2 py-2 font-bold ${tab === 'galeria' ? 'text-blue-600 dark:text-blue-400' : ''}`}
        >
          <Logo size={24} />
          {APP_NAME}
        </button>
      </header>
      <nav
        aria-label="Navegação principal"
        className="fixed inset-x-0 bottom-0 z-40 border-t border-slate-200 bg-white/95 backdrop-blur md:sticky md:top-0 md:bottom-auto md:border-t-0 md:border-b dark:border-slate-800 dark:bg-slate-900/95"
      >
        <div className="mx-auto flex max-w-3xl items-center justify-around md:justify-start md:gap-2 md:px-4">
          <button
            type="button"
            onClick={() => setTab('galeria')}
            aria-label={`${APP_NAME}: abrir fotos do carro`}
            aria-current={tab === 'galeria' ? 'page' : undefined}
            className={`mr-4 hidden items-center gap-2 rounded-lg px-2 py-1 font-bold hover:bg-slate-100 md:flex dark:hover:bg-slate-800 ${tab === 'galeria' ? 'text-blue-600 dark:text-blue-400' : ''}`}
          >
            <Logo size={24} />
            {APP_NAME}
          </button>
          {TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              aria-current={tab === t.id ? 'page' : undefined}
              className={`flex flex-1 flex-col items-center gap-0.5 px-2 py-2 text-xs font-medium md:flex-none md:flex-row md:gap-2 md:text-sm ${
                tab === t.id ? 'text-blue-600 dark:text-blue-400' : 'text-slate-500 dark:text-slate-400'
              }`}
            >
              <span aria-hidden="true" className="text-lg md:text-base">{t.icon}</span>
              {t.label}
            </button>
          ))}
        </div>
      </nav>
      <main className="mx-auto max-w-3xl p-4 pb-40 md:pb-24">
        {api.error && (
          <div role="alert" className="mb-4 flex items-start justify-between gap-3 rounded-lg bg-red-50 p-3 text-sm text-red-800 dark:bg-red-950 dark:text-red-200">
            <span>{api.error}</span>
            <button type="button" className="shrink-0 font-medium underline" onClick={api.clearError}>Fechar</button>
          </div>
        )}
        <ErrorBoundary key={tab} message={SCREEN_ERROR}>
          <Suspense fallback={<Loading className="py-10" />}>
            {tab === 'galeria' ? (
              <Galeria onBack={() => setTab('visao')} />
            ) : api.loading ? (
              <p className="py-10 text-center muted">Carregando seus dados…</p>
            ) : (
              <>
                {tab === 'visao' && <VisaoGeral api={api} />}
                {tab === 'gastos' && <Gastos api={api} />}
                {tab === 'planejados' && <Planejados api={api} />}
                {tab === 'ajustes' && <Ajustes api={api} email={email} />}
              </>
            )}
          </Suspense>
        </ErrorBoundary>
      </main>
    </div>
  )
}
