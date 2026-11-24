import { describe, expect, it } from 'vitest'
import { safeHttpUrl } from './url'

describe('safeHttpUrl', () => {
  it('aceita http e https', () => {
    expect(safeHttpUrl('https://exemplo.com/peca?id=1')).toBe('https://exemplo.com/peca?id=1')
    expect(safeHttpUrl('http://exemplo.com')).toBe('http://exemplo.com/')
  })
  it('recusa outros protocolos', () => {
    expect(safeHttpUrl('javascript:alert(1)')).toBeNull()
    expect(safeHttpUrl('data:text/html,<b>x</b>')).toBeNull()
    expect(safeHttpUrl('ftp://exemplo.com')).toBeNull()
  })
  it('recusa texto comum e endereços quebrados', () => {
    expect(safeHttpUrl('trocar farol, ver https://exemplo.com')).toBeNull()
    expect(safeHttpUrl('https://')).toBeNull()
    expect(safeHttpUrl('')).toBeNull()
  })
})
