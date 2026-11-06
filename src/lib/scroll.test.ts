import { describe, expect, it } from 'vitest'
import { scrollProgress } from './scroll'

describe('scrollProgress', () => {
  it('é 0 no topo e 1 no fim', () => {
    expect(scrollProgress(0, 3000, 1000)).toBe(0)
    expect(scrollProgress(2000, 3000, 1000)).toBe(1)
  })

  it('é proporcional no meio', () => {
    expect(scrollProgress(500, 3000, 1000)).toBe(0.25)
  })

  it('não passa dos limites (rolagem elástica do Safari)', () => {
    expect(scrollProgress(-40, 3000, 1000)).toBe(0)
    expect(scrollProgress(2060, 3000, 1000)).toBe(1)
  })

  it('página que cabe na tela dá 0', () => {
    expect(scrollProgress(0, 800, 1000)).toBe(0)
    expect(scrollProgress(0, 1000, 1000)).toBe(0)
  })
})
