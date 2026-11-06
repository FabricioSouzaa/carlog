import { describe, expect, it } from 'vitest'
import { DEMO_TOTAL_SECONDS, demoSeconds, formatStopwatch } from './stopwatch'

describe('demoSeconds', () => {
  it('fica em zero antes de começar e no total depois de salvar', () => {
    expect(demoSeconds(0, 0.1, 4)).toBe(0)
    expect(demoSeconds(0.1, 0.1, 4)).toBe(0)
    expect(demoSeconds(4, 0.1, 4)).toBe(DEMO_TOTAL_SECONDS)
    expect(demoSeconds(5, 0.1, 4)).toBe(DEMO_TOTAL_SECONDS)
  })

  it('corre em linha reta no meio, em segundos inteiros', () => {
    expect(demoSeconds(2, 0, 4, 40)).toBe(20)
    expect(Number.isInteger(demoSeconds(1.37, 0.1, 4))).toBe(true)
  })

  it('nunca volta para trás ao rolar para frente', () => {
    let last = -1
    for (let p = 0; p <= 5; p += 0.05) {
      const s = demoSeconds(p, 0.1, 4)
      expect(s).toBeGreaterThanOrEqual(last)
      last = s
    }
  })
})

describe('formatStopwatch', () => {
  it('formata minutos e segundos com dois dígitos', () => {
    expect(formatStopwatch(0)).toBe('00:00')
    expect(formatStopwatch(9)).toBe('00:09')
    expect(formatStopwatch(38)).toBe('00:38')
    expect(formatStopwatch(83)).toBe('01:23')
  })

  it('não mostra tempo negativo', () => {
    expect(formatStopwatch(-3)).toBe('00:00')
  })
})
