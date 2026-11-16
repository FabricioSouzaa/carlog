import { describe, expect, it } from 'vitest'
import { loginErrorMessage, recoveryErrorMessage } from './authErrors'

describe('loginErrorMessage', () => {
  it('senha ou e-mail errados', () => {
    expect(loginErrorMessage({ code: 'invalid_credentials', status: 400 })).toBe('E-mail ou senha incorretos.')
  })
  it('limite de tentativas', () => {
    expect(loginErrorMessage({ status: 429 })).toMatch(/Muitas tentativas/)
  })
  it('chave inválida não é confundida com senha errada', () => {
    expect(loginErrorMessage({ status: 401, message: 'Invalid API key' })).toMatch(/chave do Supabase/)
  })
  it('falha de rede ou cabeçalho inválido', () => {
    expect(loginErrorMessage({ name: 'AuthRetryableFetchError', status: 0 })).toMatch(/servidor/)
  })
  it('erro desconhecido tem mensagem genérica', () => {
    expect(loginErrorMessage({ status: 500, code: 'unexpected_failure' })).toBe('Não foi possível entrar. Tente novamente.')
  })
})

describe('recoveryErrorMessage', () => {
  it('limite de envio de e-mails', () => {
    expect(recoveryErrorMessage({ code: 'over_email_send_rate_limit', status: 429 })).toMatch(/Muitos pedidos/)
    expect(recoveryErrorMessage({ status: 429 })).toMatch(/Muitos pedidos/)
  })
  it('e-mail inválido', () => {
    expect(recoveryErrorMessage({ code: 'email_address_invalid', status: 400 })).toBe('Confira o e-mail digitado.')
  })
  it('falha de rede', () => {
    expect(recoveryErrorMessage({ name: 'AuthRetryableFetchError', status: 0 })).toMatch(/servidor/)
  })
  it('erro desconhecido', () => {
    expect(recoveryErrorMessage({ status: 500, code: 'unexpected_failure' })).toBe('Não foi possível enviar o e-mail. Tente novamente.')
  })
})
