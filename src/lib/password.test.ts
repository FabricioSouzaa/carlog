import { describe, expect, it } from 'vitest'
import { passwordProblem, passwordUpdateError } from './password'

describe('passwordProblem', () => {
  it('exige tamanho mínimo', () => {
    expect(passwordProblem('1234567', '1234567')).toMatch(/pelo menos 8/)
  })
  it('exige confirmação igual', () => {
    expect(passwordProblem('senha-forte-1', 'senha-forte-2')).toBe('As senhas não conferem.')
  })
  it('aceita senha válida', () => {
    expect(passwordProblem('senha-forte-1', 'senha-forte-1')).toBeNull()
  })
})

describe('passwordUpdateError', () => {
  it('senha igual à atual', () => {
    expect(passwordUpdateError({ code: 'same_password' })).toMatch(/diferente/)
  })
  it('sessão expirada', () => {
    expect(passwordUpdateError({ code: 'session_expired' })).toMatch(/sessão expirou/)
  })
  it('exige entrar de novo (troca segura de senha)', () => {
    expect(passwordUpdateError({ code: 'reauthentication_needed' })).toMatch(/entre de novo/)
  })
  it('erro desconhecido', () => {
    expect(passwordUpdateError({})).toMatch(/Não foi possível/)
  })
})
