import { describe, expect, it } from 'vitest'
import { activeIndex, scrollTargetFor, wheelProgress } from './wheel'

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

describe('activeIndex', () => {
  it('arredonda para o item mais próximo', () => {
    expect(activeIndex(0, 5)).toBe(0)
    expect(activeIndex(0.12, 5)).toBe(0)
    expect(activeIndex(0.13, 5)).toBe(1)
    expect(activeIndex(0.5, 5)).toBe(2)
    expect(activeIndex(1, 5)).toBe(4)
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
