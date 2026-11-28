import { lazy, Suspense, startTransition, useEffect, useState } from 'react'
import { startupLink, supabaseConfigured } from './supabase'
import { ErrorBoundary } from './components/ErrorBoundary'
import { CarSwitcher } from './components/CarSwitcher'
import { Logo } from './components/Logo'
import { APP_NAME } from './config'
import { useSession } from './useSession'
import { useData } from './useData'
import { useTheme } from './useTheme'

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
  return <Main email={session.user.email ?? ''} userId={session.user.id} />
}

function Main({ email, userId }: { email: string; userId: string }) {
  const api = useData(userId)
  const theme = useTheme()
  const [tab, setTabNow] = useState<TabId | 'galeria'>('visao')
  // em transição, a tela atual continua visível até o pedaço da aba nova chegar (sem piscar "Carregando…")
  const setTab = (t: TabId | 'galeria') => startTransition(() => setTabNow(t))

  useEffect(prefetchPages, [])

  const logo = (cls: string) => (
    <button
      type="button"
      onClick={() => setTab('galeria')}
      aria-label={`${APP_NAME}: abrir fotos do carro`}
      aria-current={tab === 'galeria' ? 'page' : undefined}
      className={`${cls} items-center gap-2 rounded-xl px-1 py-1 font-display text-lg ${tab === 'galeria' ? 'text-wash-ink' : 'text-ink'}`}
    >
      <Logo size={30} />
      {APP_NAME}
    </button>
  )
  const car = !api.loading && <CarSwitcher cars={api.data.cars} activeId={api.activeCarId} onChange={api.setActiveCar} />

  return (
    <div className="min-h-dvh text-ink">
      {/* no celular o topo leva o logo e o carro; as abas ficam na barra de baixo */}
      <header className="sticky top-0 z-30 flex items-center justify-between gap-3 border-b border-line bg-bar/95 px-4 py-2 backdrop-blur md:hidden">
        {logo('flex')}
        {car}
      </header>
      <nav
        aria-label="Navegação principal"
        className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-bar/95 backdrop-blur md:sticky md:top-0 md:bottom-auto md:border-t-0 md:border-b"
      >
        <div className="mx-auto flex max-w-5xl items-center justify-around gap-1 p-2 md:justify-start md:gap-2 md:px-8 md:py-3">
          {logo('mr-4 hidden md:flex')}
          {TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              aria-current={tab === t.id ? 'page' : undefined}
              className={`flex flex-1 flex-col items-center gap-0.5 rounded-2xl px-2 py-2 text-xs md:flex-none md:flex-row md:gap-2 md:rounded-xl md:px-4 md:py-2 md:text-sm ${
                tab === t.id ? 'bg-wash font-semibold text-wash-ink' : 'font-medium text-ink-soft hover:bg-track'
              }`}
            >
              <span aria-hidden="true" className="text-lg md:text-base">{t.icon}</span>
              {t.label}
            </button>
          ))}
          <span className="ml-auto hidden md:block">{car}</span>
        </div>
      </nav>
      <main className="mx-auto max-w-5xl p-4 pb-40 md:px-8 md:py-8 md:pb-24">
        {api.error && (
          <div role="alert" className="mb-4 flex items-start justify-between gap-3 rounded-xl bg-red-50 p-3 text-sm text-red-800 night:bg-red-950 night:text-red-200">
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
            ) : !api.activeCarId ? (
              // a carga falhou (o erro está no aviso acima): sem carro nenhuma tela consegue gravar
              <p className="py-10 text-center muted">Não foi possível carregar seus dados. Recarregue a página.</p>
            ) : (
              <>
                {tab === 'visao' && <VisaoGeral api={api} />}
                {tab === 'gastos' && <Gastos api={api} />}
                {tab === 'planejados' && <Planejados api={api} />}
                {tab === 'ajustes' && <Ajustes api={api} email={email} theme={theme} />}
              </>
            )}
          </Suspense>
        </ErrorBoundary>
      </main>
    </div>
  )
}
