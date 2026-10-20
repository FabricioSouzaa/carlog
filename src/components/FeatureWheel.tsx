import { useCallback, useEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react'
import { activeIndex, scrollTargetFor, wheelProgress } from '../lib/wheel'

/* Miniaturas simples (sem dados reais) que mostram como é cada tela. */
const Mini = ({ children }: { children: ReactNode }) => (
  <div aria-hidden="true" className="h-24 rounded-xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-800/60">
    {children}
  </div>
)
const Line = ({ w, className = 'bg-slate-300 dark:bg-slate-600' }: { w: string; className?: string }) => (
  <span className={`h-2 rounded-full ${className}`} style={{ width: w }} />
)

const ITEMS: { title: string; text: string; mini: ReactNode }[] = [
  {
    title: 'Visão geral',
    text: 'Seus totais e gráficos, num olhar.',
    mini: (
      <Mini>
        <div className="flex h-full items-end gap-1.5">
          {[30, 48, 38, 64, 52, 84].map((h, i) => (
            <span key={i} className="flex-1 rounded-t bg-blue-500" style={{ height: `${h}%` }} />
          ))}
        </div>
      </Mini>
    ),
  },
  {
    title: 'Gastos',
    text: 'Cada gasto com valor, data, km e foto da nota.',
    mini: (
      <Mini>
        <div className="flex h-full flex-col justify-between">
          {[0, 1, 2].map((i) => (
            <div key={i} className="flex items-center gap-2">
              <span className="h-3 w-3 rounded-full bg-blue-100 dark:bg-blue-900" />
              <Line w="45%" />
              <span className="ml-auto h-2 w-8 rounded-full bg-blue-500" />
            </div>
          ))}
        </div>
      </Mini>
    ),
  },
  {
    title: 'Planejados',
    text: 'O que vem pela frente, com valor e prioridade.',
    mini: (
      <Mini>
        <div className="flex h-full flex-col justify-between">
          {[0, 1, 2].map((i) => (
            <div key={i} className="flex items-center gap-2">
              <span className={`h-4 w-4 rounded ${i === 0 ? 'bg-green-500' : 'border border-slate-300 dark:border-slate-600'}`} />
              <Line w="55%" />
            </div>
          ))}
        </div>
      </Mini>
    ),
  },
  {
    title: 'Meu carro',
    text: 'A galeria de fotos do seu carro.',
    mini: (
      <Mini>
        <div className="grid h-full grid-cols-2 gap-2">
          {['from-blue-700 to-blue-500', 'from-slate-900 to-blue-700', 'from-blue-500 to-blue-300', 'from-blue-700 to-slate-900'].map((g) => (
            <span key={g} className={`rounded-lg bg-linear-to-br ${g}`} />
          ))}
        </div>
      </Mini>
    ),
  },
  {
    title: 'Ajustes',
    text: 'Categorias, backup e segurança da conta.',
    mini: (
      <Mini>
        <div className="flex h-full flex-col justify-between">
          {[0, 1, 2].map((i) => (
            <div key={i} className="flex items-center gap-2">
              <Line w="40%" />
              <span className={`relative ml-auto h-4 w-8 rounded-full ${i === 0 ? 'bg-blue-600' : 'bg-slate-300 dark:bg-slate-600'}`}>
                <span className={`absolute top-0.5 h-3 w-3 rounded-full bg-white ${i === 0 ? 'right-0.5' : 'left-0.5'}`} />
              </span>
            </div>
          ))}
        </div>
      </Mini>
    ),
  },
]

/**
 * "Tudo em um só lugar": o título fica fixo e os cards giram como o seletor de horário do iPhone:
 * o card em foco fica grande no centro e os vizinhos, menores e mais apagados, sobem e descem com a rolagem.
 * A posição vem de `--p` (0 a 1), atualizado a cada frame; o desenho de cada card é CSS (ver `.wheel-*` em index.css).
 * Com `prefers-reduced-motion` (ou sem suporte a `abs()`) vira uma lista comum, sem fixar nada.
 */
export function FeatureWheel() {
  const ref = useRef<HTMLElement>(null)
  const [active, setActive] = useState(0)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    let raf = 0
    const update = () => {
      raf = 0
      const p = wheelProgress(el.getBoundingClientRect().top, el.offsetHeight, window.innerHeight)
      el.style.setProperty('--p', p.toFixed(4))
      setActive(activeIndex(p, ITEMS.length))
    }
    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(update)
    }
    update()
    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', onScroll)
    return () => {
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', onScroll)
      if (raf) cancelAnimationFrame(raf)
    }
  }, [])

  const goTo = useCallback((index: number) => {
    const el = ref.current
    if (!el) return
    const top = scrollTargetFor(index, ITEMS.length, el.getBoundingClientRect().top + window.scrollY, el.offsetHeight, window.innerHeight)
    window.scrollTo({ top, behavior: 'smooth' })
  }, [])

  return (
    <section ref={ref} aria-labelledby="abas" className="wheel-section relative bg-slate-50 dark:bg-slate-950" style={{ '--p': 0, '--n': ITEMS.length } as CSSProperties}>
      <div className="wheel-stage sticky top-0 flex min-h-dvh items-center">
        <div className="mx-auto grid w-full max-w-5xl items-center gap-4 px-4 lg:grid-cols-[360px_1fr] lg:gap-16">
          <div>
            <p className="text-[13px] font-semibold tracking-[0.18em] text-blue-600 uppercase dark:text-blue-400">O sistema</p>
            <h2 id="abas" className="font-display mt-2 text-4xl leading-[1.08] font-bold tracking-tight lg:text-5xl">Tudo em um só lugar</h2>
            <p className="muted mt-3 !text-base lg:!text-[17px]">Cinco telas, uma para cada parte da vida do seu carro.</p>
            <ul className="mt-8 hidden space-y-1 lg:block">
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
          <ol className="wheel relative h-[430px] lg:h-[560px]">
            {ITEMS.map((it, i) => (
              <li key={it.title} className="wheel-item" style={{ '--i': i } as CSSProperties} aria-current={i === active ? 'true' : undefined}>
                <div className="card flex items-center justify-between gap-5 !p-5 shadow-[0_12px_32px_rgba(15,23,42,0.08)] lg:!p-7">
                  <div className="min-w-0">
                    <span className="font-display text-sm font-bold text-slate-300 dark:text-slate-600">0{i + 1}</span>
                    <h3 className="font-display text-2xl leading-tight font-bold tracking-tight lg:text-3xl">{it.title}</h3>
                    <p className="muted mt-1 lg:!text-base">{it.text}</p>
                  </div>
                  <div className="wheel-mini hidden w-36 shrink-0 sm:block lg:w-52">{it.mini}</div>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </div>
    </section>
  )
}
