import type { CSSProperties } from 'react'
import { FEATURES } from './features'
import { PhoneScreen } from './PhoneScreens'
import { useWheel } from './useWheel'

/**
 * Segunda versão da seção "Tudo em um só lugar": um celular fica fixo na tela e, conforme você rola,
 * a tela do app dentro dele troca (sobe, como se você navegasse) e o texto ao lado acompanha.
 * Usa a mesma conta de rolagem do seletor (`useWheel`). Sem movimento vira só a lista de textos.
 */
export function FeaturePhone() {
  const { ref, active, goTo } = useWheel(FEATURES.length)

  return (
    <section ref={ref} aria-labelledby="abas" className="wheel-section phone-section relative bg-slate-50 dark:bg-slate-950" style={{ '--p': 0, '--n': FEATURES.length } as CSSProperties}>
      <div className="wheel-stage sticky top-0 flex min-h-dvh items-center">
        <div className="mx-auto grid w-full max-w-6xl items-center gap-4 px-4 lg:grid-cols-[1fr_auto] lg:gap-24">
          <div>
            <p className="text-[13px] font-semibold tracking-[0.18em] text-blue-600 uppercase dark:text-blue-400">O sistema</p>
            <h2 id="abas" className="font-display mt-2 text-4xl leading-[1.08] font-bold tracking-tight lg:text-6xl">Tudo em um só lugar</h2>
            <p className="muted mt-3 !text-base lg:!text-lg">Cinco telas, uma para cada parte da vida do seu carro.</p>

            <ul className="mt-8 hidden space-y-1 lg:block">
              {FEATURES.map((it, i) => (
                <li key={it.title}>
                  <button
                    type="button"
                    onClick={() => goTo(i)}
                    className={`flex items-center gap-3 rounded-lg py-1.5 pr-3 text-left text-base transition-colors ${i === active ? 'font-semibold text-slate-900 dark:text-white' : 'text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-300'}`}
                  >
                    <span className={`h-2 w-2 rounded-full transition-colors ${i <= active ? 'bg-blue-600' : 'bg-slate-300 dark:bg-slate-700'}`} />
                    <span className={`font-display text-[13px] font-bold ${i <= active ? 'text-blue-600 dark:text-blue-400' : ''}`}>0{i + 1}</span>
                    {it.title}
                  </button>
                </li>
              ))}
            </ul>

            {/* o texto da tela em foco: cada um sobe e some enquanto o próximo chega */}
            <ol className="phone-copies relative mt-6 h-28 lg:mt-10 lg:h-40">
              {FEATURES.map((it, i) => (
                <li key={it.title} className="phone-copy" style={{ '--i': i } as CSSProperties} aria-current={i === active ? 'true' : undefined}>
                  <span className="font-display text-sm font-bold text-blue-600 lg:text-base dark:text-blue-400">0{i + 1}</span>
                  <h3 className="font-display text-3xl leading-tight font-bold tracking-tight lg:text-5xl">{it.title}</h3>
                  <p className="muted mt-2 lg:!text-xl">{it.text}</p>
                </li>
              ))}
            </ol>
          </div>

          <div aria-hidden="true" className="phone-wrap relative mx-auto h-[470px] w-[234px] lg:h-[616px] lg:w-[300px]">
            <div className="phone-glow" />
            <div className="phone absolute top-0 left-0 h-[616px] w-[300px] origin-top-left scale-[0.762] overflow-hidden rounded-[46px] border-[10px] border-slate-900 bg-slate-900 shadow-[0_30px_80px_rgba(15,23,42,0.35)] lg:scale-100 dark:border-slate-700">
              <span className="absolute top-2 left-1/2 z-20 h-5 w-20 -translate-x-1/2 rounded-full bg-slate-900 dark:bg-slate-700" />
              <div className="relative h-full w-full overflow-hidden rounded-[36px] bg-white">
                {FEATURES.map((it, i) => (
                  <div key={it.title} className="phone-screen" style={{ '--i': i } as CSSProperties}>
                    <PhoneScreen screen={it.screen} />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
