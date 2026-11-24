import { describe, expect, it } from 'vitest'
import { diffAttachments } from './attachments'

describe('diffAttachments', () => {
  it('separa as fotos novas das tiradas', () => {
    expect(diffAttachments(['a', 'b'], ['b', 'c'])).toEqual({ added: ['c'], removed: ['a'] })
  })
  it('sem mudança, nada nos dois lados', () => {
    expect(diffAttachments(['a'], ['a'])).toEqual({ added: [], removed: [] })
  })
  it('aceita gasto sem fotos (undefined)', () => {
    expect(diffAttachments(undefined, ['a'])).toEqual({ added: ['a'], removed: [] })
    expect(diffAttachments(['a'], undefined)).toEqual({ added: [], removed: ['a'] })
    expect(diffAttachments(undefined, undefined)).toEqual({ added: [], removed: [] })
  })
})
