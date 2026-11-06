import { describe, expect, it } from 'vitest'
import { railPosition } from './scroll'

const TOPS = [0, 1000, 3000, 4000] // quatro seções
const VH = 800
const DOC = 6000

describe('railPosition', () => {
  it('é 0 no topo da página', () => {
    expect(railPosition(TOPS, 0, VH, DOC)).toBe(0)
  })

  it('desliza entre dois pontos na proporção da rolagem', () => {
    expect(railPosition(TOPS, 500, VH, DOC)).toBe(0.5)
    expect(railPosition(TOPS, 2000, VH, DOC)).toBe(1.5)
  })

  it('vale exatamente o ponto quando o topo da seção chega ao topo da janela', () => {
    expect(railPosition(TOPS, 1000, VH, DOC)).toBe(1)
    expect(railPosition(TOPS, 3000, VH, DOC)).toBe(2)
  })

  it('no fim da página vale o último ponto, mesmo com a última seção curta', () => {
    expect(railPosition(TOPS, 5200, VH, DOC)).toBe(3)
    expect(railPosition(TOPS, 3500, VH, DOC)).toBe(2.5)
  })

  it('com a última seção curta, chega ao último ponto deslizando até o fim da rolagem (sem pulo)', () => {
    const doc = 4500 // rolagem máxima 3700, antes do topo da última seção (4000)
    expect(railPosition(TOPS, 3350, VH, doc)).toBeCloseTo(2.5)
    expect(railPosition(TOPS, 3690, VH, doc)).toBeGreaterThan(2.97)
    expect(railPosition(TOPS, 3700, VH, doc)).toBe(3)
  })

  it('não passa dos limites (rolagem elástica) e aguenta pontos demais ou de menos', () => {
    expect(railPosition(TOPS, -50, VH, DOC)).toBe(0)
    expect(railPosition([0], 300, VH, DOC)).toBe(0)
    expect(railPosition([], 300, VH, DOC)).toBe(0)
  })
})
