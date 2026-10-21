import { ACCESS_MESSAGE, ACCESS_WHATSAPP, APP_NAME, APP_TAGLINE } from '../config'
import { whatsappLink } from '../lib/whatsapp'
import { Logo } from './Logo'
import { Reveal } from './Reveal'

/**
 * Última seção da landing: "Pronto para testar o Carlog?". Volta ao céu escuro do hero (o velocímetro grande ao fundo,
 * como no começo) e é o fim da página: convite grande para pedir acesso, "Já tenho conta" e o rodapé.
 */
export function FinalCta({ onLogin }: { onLogin: () => void }) {
  return (
    <section aria-labelledby="pronto" className="demo-bg relative overflow-hidden text-white">
      <Logo
        tile={false}
        size={900}
        className="pointer-events-none absolute top-[6%] -right-[40%] h-[120vw] w-[120vw] opacity-15 md:-right-[12%] md:h-[820px] md:w-[820px]"
      />
      <div className="relative mx-auto flex min-h-[88dvh] max-w-5xl flex-col items-center justify-center px-4 py-24 text-center">
        <Reveal>
          <p className="text-[13px] font-semibold tracking-[0.18em] text-blue-300 uppercase">Comece agora</p>
        </Reveal>
        <Reveal delay={150}>
          <h2 id="pronto" className="font-display mt-3 max-w-3xl text-5xl leading-[1.05] font-bold tracking-tight md:text-7xl">
            Pronto para testar o {APP_NAME}?
          </h2>
        </Reveal>
        <Reveal delay={350}>
          <p className="mx-auto mt-5 max-w-xl text-base text-slate-300 md:text-xl">O acesso é liberado manualmente. Mande uma mensagem pelo WhatsApp e você recebe o seu.</p>
        </Reveal>
        <Reveal delay={550} className="mt-9 flex flex-col items-center gap-3 sm:flex-row">
          <a
            href={whatsappLink(ACCESS_WHATSAPP, ACCESS_MESSAGE)}
            target="_blank"
            rel="noopener noreferrer"
            className="cta-big btn !gap-2.5 !rounded-2xl !bg-white !px-8 !py-4 !text-lg !font-bold !text-slate-900 hover:!bg-blue-50"
          >
            Quero usar o {APP_NAME}
            <span aria-hidden="true">→</span>
          </a>
          <button type="button" onClick={onLogin} className="btn !rounded-2xl border border-white/40 !px-6 !py-4 !text-base !font-semibold text-white hover:bg-white/10">
            Já tenho conta
          </button>
        </Reveal>
      </div>

      <footer className="relative border-t border-white/10">
        <div className="mx-auto flex max-w-5xl flex-col items-center justify-between gap-3 px-4 py-6 text-sm text-slate-400 sm:flex-row">
          <span className="flex items-center gap-2.5">
            <Logo size={22} />
            <span className="font-display font-bold text-slate-200">{APP_NAME}</span>
            <span className="hidden sm:inline">· {APP_TAGLINE}</span>
          </span>
          <button type="button" className="hover:text-white" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
            Voltar ao topo ↑
          </button>
        </div>
      </footer>
    </section>
  )
}
