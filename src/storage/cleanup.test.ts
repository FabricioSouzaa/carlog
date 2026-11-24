import { describe, expect, it, vi } from 'vitest'
import { cleanupOnError, thenCleanup } from './cleanup'

describe('thenCleanup', () => {
  it('só limpa depois que a gravação termina', async () => {
    const order: string[] = []
    const op = new Promise<void>((resolve) =>
      setTimeout(() => {
        order.push('banco')
        resolve()
      }, 5),
    )
    await thenCleanup(op, async () => void order.push('fotos'))
    expect(order).toEqual(['banco', 'fotos'])
  })

  it('não limpa nada se a gravação falhar, e repassa o erro', async () => {
    const cleanup = vi.fn(async () => {})
    await expect(thenCleanup(Promise.reject(new Error('rede')), cleanup)).rejects.toThrow('rede')
    expect(cleanup).not.toHaveBeenCalled()
  })

  it('ignora falha na limpeza', async () => {
    await expect(thenCleanup(Promise.resolve(), () => Promise.reject(new Error('storage')))).resolves.toBeUndefined()
  })
})

describe('cleanupOnError', () => {
  const refused = () => Object.assign(new Error('violates check constraint'), { code: '23514' })

  it('limpa e repassa o erro quando o servidor recusa', async () => {
    const cleanup = vi.fn(async () => {})
    await expect(cleanupOnError(Promise.reject(refused()), cleanup)).rejects.toThrow('violates')
    expect(cleanup).toHaveBeenCalledOnce()
  })

  it('NÃO limpa quando o erro é ambíguo (rede): o gasto pode ter sido gravado', async () => {
    const cleanup = vi.fn(async () => {})
    await expect(cleanupOnError(Promise.reject(new Error('TypeError: Failed to fetch')), cleanup)).rejects.toThrow('Failed to fetch')
    await expect(cleanupOnError(Promise.reject(Object.assign(new Error('x'), { code: '' })), cleanup)).rejects.toThrow()
    expect(cleanup).not.toHaveBeenCalled()
  })

  it('não limpa nada quando a gravação dá certo', async () => {
    const cleanup = vi.fn(async () => {})
    await cleanupOnError(Promise.resolve(), cleanup)
    expect(cleanup).not.toHaveBeenCalled()
  })

  it('o erro original vence mesmo se a limpeza falhar', async () => {
    await expect(cleanupOnError(Promise.reject(refused()), () => Promise.reject(new Error('storage')))).rejects.toThrow('violates')
  })
})
