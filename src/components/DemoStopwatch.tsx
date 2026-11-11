import { formatStopwatch } from '../lib/stopwatch'

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
          <circle cx="62" cy="62" r="58" fill="none" stroke={done ? '#86efac' : '#93c5fd'} strokeWidth="7.4" pathLength="100" strokeDasharray={`${frac * 100} 100`} className="transition-colors duration-300" />
        </svg>
        <span className="font-display absolute inset-0 flex items-center justify-center text-[11px] font-bold text-white tabular-nums lg:text-[30px]">{formatStopwatch(seconds)}</span>
      </div>
      {/*
        As duas versões do texto ficam empilhadas no mesmo lugar e trocam por opacidade: a caixa tem sempre a largura da maior e nada pula.
        Antes o texto trocava na hora (e a caixa mudava de largura) junto com o aviso verde e o "✓" do passo 4: medido em vídeo de iPhone,
        8.994 px mudavam num único quadro, e era isso que se sentia como engasgo.
      */}
      <div className="grid min-w-0">
        <div className={`col-start-1 row-start-1 min-w-0 transition-opacity duration-300 motion-reduce:transition-none ${done ? 'opacity-0' : 'opacity-100'}`}>
          <p className="text-[11px] font-semibold tracking-[0.12em] text-blue-300 uppercase lg:text-xs lg:tracking-[0.14em]">Tempo para lançar</p>
          <p className="font-display text-base font-bold whitespace-nowrap text-white lg:mt-1 lg:text-xl">Cada passo conta</p>
          <p className="mt-1 hidden text-sm text-slate-300 lg:block">Meta: menos de 1 minuto</p>
        </div>
        <div className={`col-start-1 row-start-1 min-w-0 transition-opacity duration-300 motion-reduce:transition-none ${done ? 'opacity-100' : 'opacity-0'}`}>
          <p className="text-[11px] font-semibold tracking-[0.12em] text-green-300 uppercase lg:text-xs lg:tracking-[0.14em]">Gasto salvo</p>
          <p className="font-display text-base font-bold whitespace-nowrap text-white lg:mt-1 lg:text-xl">Em {seconds} segundos</p>
          <p className="mt-1 hidden text-sm text-slate-300 lg:block">Do zero ao gasto registrado.</p>
        </div>
      </div>
    </div>
  )
}
