import { DEMO_TOTAL_SECONDS, formatStopwatch } from '../lib/stopwatch'

/**
 * Cronômetro da demonstração: um anel que enche até 1 minuto e o tempo dentro dele. Quando o gasto é salvo, fica verde e
 * mostra quanto tempo levou. Decorativo (os leitores de tela ignoram): o título da seção já diz "menos de um minuto".
 * No celular encolhe para uma faixa baixa, sem a frase de apoio.
 */
export function DemoStopwatch({ seconds, done }: { seconds: number; done: boolean }) {
  const frac = Math.min(1, seconds / 60)
  return (
    <div
      aria-hidden="true"
      className={`demo-stopwatch items-center gap-3 rounded-[18px] border px-3 py-2 lg:gap-5 lg:rounded-[22px] lg:px-[22px] lg:py-5 ${done ? 'border-green-300/50 bg-green-950/55' : 'border-blue-300/30 bg-white/[0.07]'}`}
    >
      <div className="relative size-12 shrink-0 lg:size-[124px]">
        <svg viewBox="0 0 124 124" className="size-full -rotate-90">
          <circle cx="62" cy="62" r="58" fill="none" stroke="rgb(255 255 255 / 0.12)" strokeWidth="7.4" />
          <circle cx="62" cy="62" r="58" fill="none" stroke={done ? '#86efac' : '#93c5fd'} strokeWidth="7.4" pathLength="100" strokeDasharray={`${frac * 100} 100`} />
        </svg>
        <span className="font-display absolute inset-0 flex items-center justify-center text-[11px] font-bold text-white tabular-nums lg:text-[30px]">{formatStopwatch(seconds)}</span>
      </div>
      <div className="min-w-0">
        <p className={`text-[11px] font-semibold tracking-[0.12em] uppercase lg:text-xs lg:tracking-[0.14em] ${done ? 'text-green-300' : 'text-blue-300'}`}>{done ? 'Gasto salvo' : 'Tempo para lançar'}</p>
        <p className="font-display text-base font-bold text-white lg:mt-1 lg:text-[22px]">{done ? `Em ${DEMO_TOTAL_SECONDS} segundos` : 'Cada passo conta'}</p>
        <p className="mt-1 hidden text-sm text-slate-300 lg:block">{done ? 'Do zero ao gasto registrado.' : 'Meta: menos de 1 minuto'}</p>
      </div>
    </div>
  )
}
