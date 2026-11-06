import { ramp } from './wheel'

/** Tempo (s) que a demonstração mostra no fim: o de quem preenche tudo, com foto e km. Ilustrativo, não é medido. */
export const DEMO_TOTAL_SECONDS = 38

/**
 * Segundos que o cronômetro da demonstração marca para a posição `pos` da cena (em passos: 0 = janela vazia, `end` = salvo).
 * Corre em linha reta entre `start` (o primeiro campo começa a ser preenchido) e `end`, sempre em segundos inteiros.
 */
export function demoSeconds(pos: number, start: number, end: number, total = DEMO_TOTAL_SECONDS): number {
  return Math.round(ramp(pos, start, end) * total)
}

/** `83` -> `01:23`. */
export function formatStopwatch(seconds: number): string {
  const s = Math.max(0, Math.floor(seconds))
  return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`
}
