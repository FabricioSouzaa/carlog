import { describe, expect, it } from 'vitest'
import { activeIndex, ramp, scrollTargetFor, wheelPosition, wheelProgress } from './wheel'

describe('wheelProgress', () => {
  it('é 0 antes e no começo, 1 no fim e passa de 1 para 1', () => {
    expect(wheelProgress(300, 3000, 1000)).toBe(0)
    expect(wheelProgress(0, 3000, 1000)).toBe(0)
    expect(wheelProgress(-1000, 3000, 1000)).toBe(0.5)
    expect(wheelProgress(-2000, 3000, 1000)).toBe(1)
    expect(wheelProgress(-2600, 3000, 1000)).toBe(1)
  })
  it('seção do tamanho da janela não tem o que rolar', () => {
    expect(wheelProgress(-50, 800, 900)).toBe(0)
  })
})

describe('wheelPosition', () => {
  it('começa em 0, termina no último item e para exatamente em cada item', () => {
    expect(wheelPosition(0, 5)).toBe(0)
    expect(wheelPosition(1, 5)).toBe(4)
    expect(wheelPosition(0.25, 5)).toBe(1)
    expect(wheelPosition(0.5, 5)).toBe(2)
  })
  it('fica parado perto de cada item e troca no meio do trecho', () => {
    expect(wheelPosition(0.04, 5)).toBe(0) // dentro da pausa do item 0
    expect(wheelPosition(0.125, 5)).toBeCloseTo(0.5, 5) // meio do caminho entre 0 e 1
  })
  it('nunca anda para trás ao rolar para frente', () => {
    let prev = -1
    for (let p = 0; p <= 1.0001; p += 0.01) {
      const pos = wheelPosition(p, 5)
      expect(pos).toBeGreaterThanOrEqual(prev)
      prev = pos
    }
  })
  it('um item só fica sempre no zero', () => {
    expect(wheelPosition(0.6, 1)).toBe(0)
  })
})

describe('activeIndex', () => {
  it('arredonda a posição para o item mais próximo', () => {
    expect(activeIndex(0, 5)).toBe(0)
    expect(activeIndex(0.49, 5)).toBe(0)
    expect(activeIndex(0.51, 5)).toBe(1)
    expect(activeIndex(4, 5)).toBe(4)
    expect(activeIndex(9, 5)).toBe(4)
  })
  it('um item só fica sempre no zero', () => {
    expect(activeIndex(0.7, 1)).toBe(0)
  })
})

describe('scrollTargetFor', () => {
  it('leva cada item ao seu ponto de foco', () => {
    expect(scrollTargetFor(0, 5, 1000, 3200, 1000)).toBe(1000)
    expect(scrollTargetFor(2, 5, 1000, 3200, 1000)).toBe(2100)
    expect(scrollTargetFor(4, 5, 1000, 3200, 1000)).toBe(3200)
  })
  it('índice fora do intervalo é limitado', () => {
    expect(scrollTargetFor(9, 5, 0, 3200, 1000)).toBe(2200)
  })
})

describe('ramp', () => {
  it('vai de 0 a 1 entre os dois pontos e fica nas pontas fora deles', () => {
    expect(ramp(0, 1, 2)).toBe(0)
    expect(ramp(1, 1, 2)).toBe(0)
    expect(ramp(1.25, 1, 2)).toBe(0.25)
    expect(ramp(2, 1, 2)).toBe(1)
    expect(ramp(9, 1, 2)).toBe(1)
  })
  it('trecho de tamanho zero vira um degrau', () => {
    expect(ramp(0.9, 1, 1)).toBe(0)
    expect(ramp(1, 1, 1)).toBe(1)
  })
})
