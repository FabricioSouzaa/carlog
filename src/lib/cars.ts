import type { Car } from '../types'

/** Carro ativo: o guardado neste aparelho, se ainda existir; senão o mais antigo (a lista já vem ordenada). */
export function resolveActiveCarId(cars: Car[], stored: string | null | undefined): string | undefined {
  if (stored && cars.some((c) => c.id === stored)) return stored
  return cars[0]?.id
}

/** Só os itens do carro dado (gastos e planejados). */
export function forCar<T extends { carId: string }>(items: T[], carId: string | undefined): T[] {
  return carId ? items.filter((i) => i.carId === carId) : []
}

/** Por que este carro não pode ser apagado agora (null = pode). O banco confere de novo: isto só dá a mensagem antes. */
export function deleteCarBlocker(
  cars: Car[],
  carId: string,
  usage: { expenses: { carId: string }[]; planned: { carId: string }[] },
): string | null {
  if (cars.length <= 1) return 'O último carro não pode ser removido.'
  if (usage.expenses.some((e) => e.carId === carId) || usage.planned.some((p) => p.carId === carId)) {
    return 'Esse carro tem gastos ou planejados. Mova ou apague esses lançamentos antes de remover o carro.'
  }
  return null
}
