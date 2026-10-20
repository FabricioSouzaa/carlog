import type { CSSProperties } from 'react'
import { ScaledScreen } from './AppScreens'
import { FEATURES as ITEMS } from './features'
import { useMediaQuery } from './useMediaQuery'
import { useWheel } from './useWheel'

/**
 * "Tudo em um só lugar": o título fica fixo e os cards giram como o seletor de horário do iPhone:
 * o card em foco fica grande no centro e os vizinhos, menores e mais apagados, sobem e descem com a rolagem.
 * A posição vem de `--p` (0 a 1), atualizado a cada frame; o desenho de cada card é CSS (ver `.wheel-*` em index.css).
 * Cada card para um instante no centro (`wheelPosition`) e o movimento desliza atrás da rolagem. Com `prefers-reduced-motion` (ou sem suporte a `abs()`) vira uma lista comum, sem fixar nada.
 */
export function FeatureWheel() {
  const { ref, active, goTo } = useWheel(ITEMS.length)
  // a réplica da tela só aparece (e só é montada) a partir de tablet; no celular o card é só texto
  const showScreens = useMediaQuery('(min-width: 640px)')

  return (
    <section ref={ref} aria-labelledby="abas" className="wheel-section relative bg-slate-50 dark:bg-slate-950" style={{ '--p': 0, '--n': ITEMS.length } as CSSProperties}>
      <div className="wheel-stage flex items-center">
        <a href="#cadastrar" className="sr-only focus:not-sr-only focus:absolute focus:top-3 focus:left-3 focus:z-50 focus:rounded-lg focus:bg-white focus:px-3 focus:py-2 focus:text-sm focus:shadow">Pular esta seção</a>
        <div className="mx-auto grid w-full max-w-6xl items-center gap-4 px-4 lg:grid-cols-[340px_1fr] lg:gap-14">
          <div>
            <p className="text-[13px] font-semibold tracking-[0.18em] text-blue-600 uppercase dark:text-blue-400">O sistema</p>
            <h2 id="abas" className="font-display mt-2 text-4xl leading-[1.08] font-bold tracking-tight lg:text-5xl">Tudo em um só lugar</h2>
            <p className="muted mt-3 !text-base lg:!text-[17px]">Cinco telas, uma para cada parte da vida do seu carro.</p>
            <ul className="wheel-nav mt-8 space-y-1 max-lg:sr-only max-lg:focus-within:not-sr-only">
              {ITEMS.map((it, i) => (
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
          </div>
          <div className="relative">
            {/* faixa de seleção no centro, como no seletor do iPhone */}
            <div aria-hidden="true" className="wheel-glow" />
            <ol className="wheel relative">
              {ITEMS.map((it, i) => (
                <li key={it.title} className="wheel-item" style={{ '--i': i } as CSSProperties} aria-current={i === active ? 'true' : undefined}>
                  <div className="wheel-card card flex items-center justify-between gap-5 !p-6 lg:gap-8 lg:!p-10">
                    <div className="min-w-0">
                      <span className="wheel-num font-display text-sm font-bold lg:text-base">0{i + 1}</span>
                      <h3 className="font-display text-3xl leading-tight font-bold tracking-tight whitespace-nowrap lg:text-5xl">{it.title}</h3>
                      <p className="muted mt-2 lg:!text-xl">{it.text}</p>
                    </div>
                    {showScreens && (
                      <div className="wheel-mini shrink-0">
                        <ScaledScreen screen={it.screen} />
                      </div>
                    )}
                  </div>
                </li>
              ))}
            </ol>
          </div>
        </div>
      </div>
    </section>
  )
}
