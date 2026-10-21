import type { CSSProperties } from 'react'
import { FeatureDemo } from '../components/FeatureDemo'
import { FinalCta } from '../components/FinalCta'
import { FeatureOverview } from '../components/FeatureOverview'
import { FeatureWheel } from '../components/FeatureWheel'
import { Logo } from '../components/Logo'
import { Reveal } from '../components/Reveal'
import { Typewriter } from '../components/Typewriter'
import { ACCESS_MESSAGE, ACCESS_WHATSAPP, APP_NAME, APP_SLOGAN, APP_TAGLINE } from '../config'
import { typingDuration } from '../lib/typing'
import { whatsappLink } from '../lib/whatsapp'

const HERO_TITLE = APP_SLOGAN
// o que vem depois do título só entra quando ele termina de ser digitado
const TYPED_MS = typingDuration(HERO_TITLE)

/** Intervalo entre uma frase e a seguinte, depois que o título termina de ser digitado. */
const CHECK_STEP_MS = 420
const CHECKS = ['Registre cada gasto em segundos', 'Planeje o que ainda vem pela frente', 'Veja para onde vai o seu dinheiro'] as const

export function Landing({ onLogin }: { onLogin: () => void }) {
  return (
    <div className="min-h-dvh">
      <main>
      {/* hero escuro em tela cheia: o velocímetro grande ao fundo é a imagem; o cabeçalho é só o nome e o descritivo */}
      <div className="relative flex min-h-dvh flex-col overflow-hidden bg-linear-to-b from-slate-900 to-blue-700 text-white">
        <Logo tile={false} size={900} className="pointer-events-none absolute top-[8%] -right-[35%] h-[110vw] w-[110vw] opacity-20 md:-top-[2%] md:-right-[12%] md:h-[900px] md:w-[900px]" />
        <header className="relative mx-auto flex w-full max-w-5xl items-center justify-between px-4 py-5">
          <span className="flex items-center gap-3.5">
            <span className="font-display text-2xl font-bold tracking-tight">{APP_NAME}</span>
            <span aria-hidden="true" className="hidden h-[18px] w-px bg-white/30 sm:block" />
            <span className="hidden text-sm text-slate-300 sm:block">{APP_TAGLINE}</span>
          </span>
          <button type="button" className="btn-ghost !text-slate-200 hover:!bg-white/10" onClick={onLogin}>Entrar</button>
        </header>

        <section aria-labelledby="pitch" className="relative mx-auto flex w-full max-w-5xl flex-1 flex-col justify-center px-4 pb-20 md:pl-40">
          {/* entrada ao carregar (Reveal) e, ao rolar, cada parte sai subindo em ritmos diferentes (scrub-exit) */}
          <div className="scrub-exit" style={{ '--shift': '-28px' } as CSSProperties}>
            <h1 id="pitch" className="font-display max-w-3xl text-5xl leading-[1.06] font-bold tracking-tight md:text-7xl">
              <Typewriter text={HERO_TITLE} />
            </h1>
          </div>
          <div className="scrub-exit" style={{ '--shift': '-56px' } as CSSProperties}>
            {/* depois do título digitado: cada frase sobe e, logo em seguida, o seu check "se desenha" (ver .check-* em index.css) */}
            <ul className="mt-8 space-y-3.5 text-lg md:text-xl">
              {CHECKS.map((c, i) => (
                <li key={c} className="check-line flex items-center gap-3 font-medium" style={{ '--d': `${TYPED_MS + i * CHECK_STEP_MS}ms` } as CSSProperties}>
                  <span aria-hidden="true" className="check-badge flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-blue-500">
                    <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="3.4" strokeLinecap="round" strokeLinejoin="round">
                      <path className="check-tick" d="M5 12.5l4.5 4.5L19 7.5" pathLength="1" />
                    </svg>
                  </span>
                  {c}
                </li>
              ))}
            </ul>
          </div>
          <div className="scrub-exit" style={{ '--shift': '-84px' } as CSSProperties}>
            <Reveal delay={TYPED_MS + 3 * CHECK_STEP_MS + 300} className="mt-9 flex flex-col gap-3 sm:flex-row">
              <a href={whatsappLink(ACCESS_WHATSAPP, ACCESS_MESSAGE)} target="_blank" rel="noopener noreferrer" className="btn !bg-white !px-6 !py-3.5 !text-[15px] !font-semibold !text-slate-900 hover:!bg-slate-100">
                Solicitar acesso pelo WhatsApp
              </a>
              <button type="button" className="btn border border-white/40 !px-6 !py-3.5 !text-[15px] !font-semibold text-white hover:bg-white/10" onClick={onLogin}>Já tenho conta</button>
            </Reveal>
          </div>
        </section>
      </div>

      {/* o azul do hero se desfaz num degradê até o fundo claro; o título do seletor só fixa depois dele */}
      <div aria-hidden="true" className="h-[20dvh] bg-linear-to-b from-blue-700 to-slate-50 dark:to-slate-950" />
      <FeatureWheel />
      {/* o claro da seção 2 se desfaz no céu da seção 3, e o céu volta ao claro depois */}
      <div aria-hidden="true" className="demo-fade" />
      <FeatureDemo />
      <div aria-hidden="true" className="demo-fade-out" />
      <FeatureOverview />
      </main>
      {/* o claro do raio-X volta ao céu do começo para o fim da página */}
      <div aria-hidden="true" className="demo-fade" />
      <FinalCta onLogin={onLogin} />
    </div>
  )
}
