import { describe, expect, it } from 'vitest'
import { nextStableViewport } from './stableViewport'

const phone = { width: 390, height: 664 } // iPhone com a barra de endereço aberta

describe('nextStableViewport', () => {
  it('na primeira medida usa a janela como está', () => {
    expect(nextStableViewport(null, phone, true)).toEqual(phone)
  })

  it('no computador acompanha a janela, inclusive só a altura', () => {
    expect(nextStableViewport({ width: 1440, height: 900 }, { width: 1440, height: 700 }, false)).toEqual({ width: 1440, height: 700 })
    expect(nextStableViewport({ width: 1440, height: 700 }, { width: 1440, height: 900 }, false)).toEqual({ width: 1440, height: 900 })
  })

  it('no celular a barra de endereço encolhendo (janela cresce) não muda a altura guardada', () => {
    expect(nextStableViewport(phone, { width: 390, height: 748 }, true)).toEqual(phone)
  })

  it('no celular a barra reaparecendo (janela diminui) baixa a altura guardada para a menor vista', () => {
    const collapsedFirst = { width: 390, height: 748 } // a página abriu com a barra já recolhida
    expect(nextStableViewport(collapsedFirst, { width: 390, height: 664 }, true)).toEqual({ width: 390, height: 664 })
  })

  it('girar a tela (largura muda) recomeça', () => {
    expect(nextStableViewport(phone, { width: 844, height: 390 }, true)).toEqual({ width: 844, height: 390 })
  })

  it('salto grande (teclado na tela) recomeça em vez de ser tratado como barra', () => {
    expect(nextStableViewport(phone, { width: 390, height: 340 }, true)).toEqual({ width: 390, height: 340 })
  })
})
