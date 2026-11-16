import { describe, expect, it, vi } from 'vitest'
import { thenCleanup } from './cleanup'

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
