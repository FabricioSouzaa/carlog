import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { AppData } from '../types'

const remote = vi.hoisted(() => ({
  fetchAll: vi.fn(),
  insertCategories: vi.fn(),
  insertExpenses: vi.fn(),
  insertPlanned: vi.fn(),
}))
const images = vi.hoisted(() => ({ saveImage: vi.fn(), deleteImage: vi.fn() }))
const legacy = vi.hoisted(() => ({ getLegacyImage: vi.fn() }))
vi.mock('./remote', () => remote)
vi.mock('./images', () => images)
vi.mock('./legacy', () => legacy)

import { importInto } from './backup'

const source: AppData = {
  categories: [{ id: 'c1', name: 'Peças' }],
  expenses: [{ id: 'e1', description: 'Pastilha', amount: 100, date: '2026-01-01', categoryId: 'c1', type: 'maintenance', createdAt: '2026-01-01T00:00:00Z', attachments: ['old1', 'old2'] }],
  planned: [],
}

const refused = () => Object.assign(new Error('violates check constraint'), { code: '23514' })

beforeEach(() => {
  vi.clearAllMocks()
  remote.fetchAll.mockResolvedValue({ categories: [{ id: 'fb', name: 'Outros', isFallback: true }], expenses: [], planned: [] })
  remote.insertCategories.mockResolvedValue(undefined)
  remote.insertExpenses.mockResolvedValue(undefined)
  remote.insertPlanned.mockResolvedValue(undefined)
  legacy.getLegacyImage.mockResolvedValue(new Blob(['x']))
  images.saveImage.mockResolvedValue(undefined)
  images.deleteImage.mockResolvedValue(undefined)
})

describe('importInto: fotos enviadas antes dos gastos', () => {
  it('se o servidor recusa os gastos, apaga as fotos que já subiram', async () => {
    remote.insertExpenses.mockRejectedValue(refused())
    await expect(importInto(source, { withLegacyImages: true })).rejects.toThrow('violates')
    expect(images.saveImage).toHaveBeenCalledTimes(2)
    expect(images.deleteImage).toHaveBeenCalledTimes(2)
    for (const [id] of images.saveImage.mock.calls) expect(images.deleteImage).toHaveBeenCalledWith(id)
  })

  it('erro de rede NÃO apaga: o gasto pode ter sido gravado', async () => {
    remote.insertExpenses.mockRejectedValue(new Error('Failed to fetch'))
    await expect(importInto(source, { withLegacyImages: true })).rejects.toThrow('Failed to fetch')
    expect(images.deleteImage).not.toHaveBeenCalled()
  })

  it('falha inesperada no meio do envio das fotos apaga as que já subiram', async () => {
    legacy.getLegacyImage.mockResolvedValueOnce(new Blob(['x'])).mockRejectedValueOnce(new Error('indexeddb'))
    await expect(importInto(source, { withLegacyImages: true })).rejects.toThrow('indexeddb')
    expect(images.saveImage).toHaveBeenCalledTimes(1)
    expect(images.deleteImage).toHaveBeenCalledTimes(1)
    expect(remote.insertExpenses).not.toHaveBeenCalled()
  })

  it('tudo certo: nada é apagado', async () => {
    const r = await importInto(source, { withLegacyImages: true })
    expect(r).toMatchObject({ expenses: 1, photos: 2, photosSkipped: 0 })
    expect(images.deleteImage).not.toHaveBeenCalled()
  })
})
