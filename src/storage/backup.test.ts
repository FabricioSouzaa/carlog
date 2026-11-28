import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { BackupData } from '../types'

const remote = vi.hoisted(() => ({
  fetchAll: vi.fn(),
  insertCars: vi.fn(),
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

const source: BackupData = {
  categories: [{ id: 'c1', name: 'Peças' }],
  expenses: [{ id: 'e1', description: 'Pastilha', amount: 100, date: '2026-01-01', categoryId: 'c1', type: 'maintenance', createdAt: '2026-01-01T00:00:00Z', attachments: ['old1', 'old2'] }],
  planned: [],
}

const refused = () => Object.assign(new Error('violates check constraint'), { code: '23514' })

beforeEach(() => {
  vi.clearAllMocks()
  remote.fetchAll.mockResolvedValue({ cars: [{ id: 'car1', name: 'Meu carro' }], categories: [{ id: 'fb', name: 'Outros', isFallback: true }], expenses: [], planned: [] })
  remote.insertCars.mockResolvedValue(undefined)
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

describe('importInto: carros', () => {
  const withCars: BackupData = {
    cars: [{ id: 'k1', name: 'civic', model: 'EXL', year: 2020 }, { id: 'k2', name: 'Meu carro' }],
    categories: [],
    expenses: [
      { id: 'e1', description: 'a', amount: 1, date: '2026-01-01', categoryId: 'x', type: 'routine', createdAt: 't', carId: 'k1' },
      { id: 'e2', description: 'b', amount: 1, date: '2026-01-01', categoryId: 'x', type: 'routine', createdAt: 't', carId: 'k2' },
      { id: 'e3', description: 'c', amount: 1, date: '2026-01-01', categoryId: 'x', type: 'routine', createdAt: 't' },
    ],
    planned: [{ id: 'p1', description: 'd', estimatedAmount: 1, categoryId: 'x', type: 'routine', priority: 'low', status: 'planned', carId: 'k1' }],
  }

  it('backup antigo (sem carros) cai todo no carro mais antigo', async () => {
    await importInto(source)
    expect(remote.insertCars).toHaveBeenCalledWith([])
    expect(remote.insertExpenses.mock.calls[0][0].every((e: { carId: string }) => e.carId === 'car1')).toBe(true)
  })

  it('casa carro pelo nome (sem diferenciar maiúsculas) e cria os que faltam', async () => {
    await importInto(withCars)
    const created = remote.insertCars.mock.calls[0][0]
    expect(created).toHaveLength(1)
    expect(created[0]).toMatchObject({ name: 'civic', model: 'EXL', year: 2020 })
    const [e1, e2, e3] = remote.insertExpenses.mock.calls[0][0]
    expect(e1.carId).toBe(created[0].id)
    expect(e2.carId).toBe('car1') // "Meu carro" já existe na conta
    expect(e3.carId).toBe('car1') // sem carro: destino padrão
    expect(remote.insertPlanned.mock.calls[0][0][0].carId).toBe(created[0].id)
  })

  it('os carros são criados antes dos gastos', async () => {
    await importInto(withCars)
    expect(remote.insertCars.mock.invocationCallOrder[0]).toBeLessThan(remote.insertExpenses.mock.invocationCallOrder[0])
  })

  it('usa o carro de destino escolhido para quem vem sem carro', async () => {
    remote.fetchAll.mockResolvedValue({ cars: [{ id: 'car1', name: 'Meu carro' }, { id: 'car2', name: 'Outro' }], categories: [{ id: 'fb', name: 'Outros', isFallback: true }], expenses: [], planned: [] })
    await importInto(source, { carId: 'car2' })
    expect(remote.insertExpenses.mock.calls[0][0][0].carId).toBe('car2')
  })
})
