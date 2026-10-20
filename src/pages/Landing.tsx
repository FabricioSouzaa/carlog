import type { CSSProperties, ReactNode } from 'react'
import { Logo } from '../components/Logo'
import { CategoriesMock, ExpenseFormMock, MonthlyMock, OverviewStats, PlannedMock, TypesMock } from '../components/LandingMocks'
import { Reveal, RevealItem } from '../components/Reveal'
import { Typewriter } from '../components/Typewriter'
import { ACCESS_MESSAGE, ACCESS_WHATSAPP, APP_NAME, APP_TAGLINE } from '../config'
import { typingDuration } from '../lib/typing'
import { whatsappLink } from '../lib/whatsapp'

const FEATURES = [
  { icon: '📊', title: 'Visão geral', text: 'Quanto você já gastou no total, no mês e no ano, com gráficos por categoria, por tipo e por mês.' },
  { icon: '🧾', title: 'Gastos', text: 'Registre cada gasto com valor, data, categoria, km e fotos da nota. Filtre por período, categoria e tipo.' },
  { icon: '🗓️', title: 'Planejados', text: 'Anote o que ainda vai gastar, com valor estimado e prioridade, e transforme em gasto real quando acontecer.' },
  { icon: '🚗', title: 'Meu carro', text: 'Uma galeria com as fotos do seu carro, para guardar a história dele.' },
  { icon: '⚙️', title: 'Ajustes', text: 'Suas categorias, backup dos dados em arquivo e a segurança da sua conta.' },
] as const

const STEPS = [
  { title: 'Descreva o gasto', text: 'Valor, data e categoria. Se quiser, anote o km do carro naquele momento.' },
  { title: 'Escolha o tipo', text: 'Manutenção, valorização ou rotina: você vê para onde o dinheiro vai.' },
  { title: 'Anexe a nota', text: 'Até 5 fotos da nota fiscal ou da peça, guardadas com segurança.' },
] as const

function RequestAccess({ className = '' }: { className?: string }) {
  return (
    <a href={whatsappLink(ACCESS_WHATSAPP, ACCESS_MESSAGE)} target="_blank" rel="noopener noreferrer" className={`btn-primary ${className}`}>
      Solicitar acesso pelo WhatsApp
    </a>
  )
}

function Heading({ id, title, children }: { id: string; title: string; children?: ReactNode }) {
  return (
    <div className="mx-auto mb-8 max-w-xl text-center md:mb-10">
      <Reveal>
        <h2 id={id} className="text-2xl font-bold md:text-3xl">{title}</h2>
      </Reveal>
      {children && (
        <Reveal delay={250}>
          <p className="muted mt-3 !text-base">{children}</p>
        </Reveal>
      )}
    </div>
  )
}

const HERO_TITLE = 'Cada real do seu carro, no lugar certo.'
// o que vem depois do título só entra quando ele termina de ser digitado
const TYPED_MS = typingDuration(HERO_TITLE)

const CHECKS = ['Registre cada gasto em segundos', 'Planeje o que ainda vem pela frente', 'Veja para onde vai o seu dinheiro'] as const

export function Landing({ onLogin }: { onLogin: () => void }) {
  return (
    <div className="min-h-dvh">
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
            <Reveal delay={TYPED_MS - 200}>
              <ul className="mt-8 space-y-3.5 text-lg md:text-xl">
                {CHECKS.map((c) => (
                  <li key={c} className="flex items-center gap-3 font-medium">
                    <span aria-hidden="true" className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-blue-500 text-sm font-bold">✓</span>
                    {c}
                  </li>
                ))}
              </ul>
            </Reveal>
          </div>
          <div className="scrub-exit" style={{ '--shift': '-84px' } as CSSProperties}>
            <Reveal delay={TYPED_MS + 250} className="mt-9 flex flex-col gap-3 sm:flex-row">
              <a href={whatsappLink(ACCESS_WHATSAPP, ACCESS_MESSAGE)} target="_blank" rel="noopener noreferrer" className="btn !bg-white !px-6 !py-3.5 !text-[15px] !font-semibold !text-slate-900 hover:!bg-slate-100">
                Solicitar acesso pelo WhatsApp
              </a>
              <button type="button" className="btn border border-white/40 !px-6 !py-3.5 !text-[15px] !font-semibold text-white hover:bg-white/10" onClick={onLogin}>Já tenho conta</button>
            </Reveal>
          </div>
        </section>
      </div>

      <main className="mx-auto max-w-5xl space-y-20 px-4 pt-20 pb-16 md:space-y-28 md:pt-28">
        <section aria-labelledby="abas">
          <Heading id="abas" title="Tudo em um só lugar" />
          <ul className="flex flex-wrap justify-center gap-4">
            {FEATURES.map((f, i) => (
              <li key={f.title} className="w-full sm:w-[calc(50%-0.5rem)] lg:w-[calc((100%-2rem)/3)]">
                <Reveal delay={(i % 3) * 450} className="card h-full">
                  <RevealItem i={0}><div aria-hidden="true" className="mb-2 text-3xl">{f.icon}</div></RevealItem>
                  <RevealItem i={1}><h3 className="font-semibold">{f.title}</h3></RevealItem>
                  <RevealItem i={2}><p className="muted mt-1">{f.text}</p></RevealItem>
                </Reveal>
              </li>
            ))}
          </ul>
        </section>

        <section aria-labelledby="cadastrar">
          <Heading id="cadastrar" title="Registrou, pagou, anotou">
            Cadastre o gasto em segundos, logo depois de pagar. Tudo pensado para o celular.
          </Heading>
          <div className="grid items-start gap-8 lg:grid-cols-2 lg:gap-10">
            <Reveal><ExpenseFormMock /></Reveal>
            <div className="space-y-7">
              <ol className="space-y-4">
                {STEPS.map((s, i) => (
                  <li key={s.title}>
                    <Reveal delay={i * 200} className="flex gap-3">
                      <span aria-hidden="true" className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-100 text-sm font-bold text-blue-700 dark:bg-blue-950 dark:text-blue-300">{i + 1}</span>
                      <div>
                        <h3 className="font-semibold">{s.title}</h3>
                        <p className="muted">{s.text}</p>
                      </div>
                    </Reveal>
                  </li>
                ))}
              </ol>
              <Reveal className="space-y-3">
                <h3 className="font-semibold">Planejou antes? É só marcar como realizado.</h3>
                <p className="muted">O gasto planejado vira gasto real: o formulário já vem preenchido, você só informa o valor final e a data.</p>
                <PlannedMock />
              </Reveal>
            </div>
          </div>
        </section>

        <section aria-labelledby="visao">
          <Heading id="visao" title="Veja para onde vai o seu dinheiro">
            Total gasto, gasto do mês e do ano, gráficos por categoria e por tipo, e o custo por km.
          </Heading>
          <div className="space-y-4">
            <Reveal><OverviewStats /></Reveal>
            <div className="grid items-start gap-4 lg:grid-cols-[1.4fr_1fr]">
              <Reveal><MonthlyMock /></Reveal>
              <div className="space-y-4">
                <Reveal delay={150}><CategoriesMock /></Reveal>
                <Reveal delay={300}><TypesMock /></Reveal>
              </div>
            </div>
            <p className="muted text-center !text-xs">Dados de exemplo</p>
          </div>
        </section>

        <section aria-labelledby="usar">
          <Reveal className="card mx-auto max-w-3xl text-center !p-8 md:!p-10">
            <RevealItem i={0}><h2 id="usar" className="text-2xl font-bold md:text-3xl">Quer usar?</h2></RevealItem>
            <RevealItem i={1}>
              <p className="muted mx-auto mt-3 max-w-md !text-base">
                O acesso é liberado manualmente. Mande uma mensagem pelo WhatsApp com o seu e-mail e você recebe o acesso.
              </p>
            </RevealItem>
            <RevealItem i={2} className="mt-5 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <RequestAccess className="w-full sm:w-auto" />
              <button type="button" className="btn-ghost w-full sm:w-auto" onClick={onLogin}>Já tenho conta</button>
            </RevealItem>
          </Reveal>
        </section>
      </main>
    </div>
  )
}
