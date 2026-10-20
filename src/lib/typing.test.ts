import { describe, expect, it } from 'vitest'
import { delayAfter, typingDuration } from './typing'

describe('delayAfter', () => {
  it('letras comuns usam só a velocidade', () => {
    expect(delayAfter('a', 50)).toBe(50)
  })
  it('vírgula e ponto ganham pausa', () => {
    expect(delayAfter(',', 50)).toBe(270)
    expect(delayAfter('.', 50)).toBe(370)
  })
})

describe('typingDuration', () => {
  it('soma a espera inicial, cada letra e as pausas', () => {
    // 3 letras de 10 ms + vírgula (10 + 220) + espera de 100
    expect(typingDuration('ab,c', 10, 100)).toBe(100 + 10 + 10 + 230 + 10)
  })
  it('texto vazio é só a espera inicial', () => {
    expect(typingDuration('', 48, 500)).toBe(500)
  })
})
