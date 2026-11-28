import { describe, expect, it } from 'vitest'
import { deleteCarBlocker, forCar, resolveActiveCarId } from './cars'

const cars = [{ id: 'a', name: 'Gol' }, { id: 'b', name: 'Civic' }]

describe('resolveActiveCarId', () => {
  it('usa o guardado se existir', () => expect(resolveActiveCarId(cars, 'b')).toBe('b'))
  it('guardado que não existe mais cai no mais antigo', () => expect(resolveActiveCarId(cars, 'zzz')).toBe('a'))
  it('sem guardado usa o mais antigo', () => expect(resolveActiveCarId(cars, null)).toBe('a'))
  it('sem carros devolve undefined', () => expect(resolveActiveCarId([], 'a')).toBeUndefined())
})

describe('forCar', () => {
  const items = [{ carId: 'a', n: 1 }, { carId: 'b', n: 2 }]
  it('filtra pelo carro', () => expect(forCar(items, 'b')).toEqual([{ carId: 'b', n: 2 }]))
  it('sem carro devolve vazio', () => expect(forCar(items, undefined)).toEqual([]))
})

describe('deleteCarBlocker', () => {
  const none = { expenses: [], planned: [] }
  it('o último carro não sai', () => expect(deleteCarBlocker([cars[0]], 'a', none)).toMatch(/último/))
  it('carro com gasto não sai', () => expect(deleteCarBlocker(cars, 'a', { expenses: [{ carId: 'a' }], planned: [] })).toMatch(/gastos/))
  it('carro com planejado não sai', () => expect(deleteCarBlocker(cars, 'a', { expenses: [], planned: [{ carId: 'a' }] })).toMatch(/planejados/))
  it('carro vazio e não último pode sair', () => expect(deleteCarBlocker(cars, 'a', { expenses: [{ carId: 'b' }], planned: [] })).toBeNull())
})
