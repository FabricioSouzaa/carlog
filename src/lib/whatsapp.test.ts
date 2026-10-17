import { describe, expect, it } from 'vitest'
import { whatsappLink } from './whatsapp'

describe('whatsappLink', () => {
  it('usa só os dígitos do telefone', () => {
    expect(whatsappLink('+55 (47) 99999-0000', 'oi')).toBe('https://wa.me/5547999990000?text=oi')
  })
  it('codifica a mensagem para a URL', () => {
    expect(whatsappLink('5547999990000', 'Oi! Quero acesso & mais')).toBe(
      'https://wa.me/5547999990000?text=Oi!%20Quero%20acesso%20%26%20mais',
    )
  })
})
