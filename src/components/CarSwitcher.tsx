import type { Car } from '../types'

/** Escolhe o carro que as telas mostram. Com um carro só não aparece: não há o que escolher. */
export function CarSwitcher({ cars, activeId, onChange }: { cars: Car[]; activeId: string | undefined; onChange: (id: string) => void }) {
  if (cars.length < 2) return null
  return (
    <div className="mb-4 flex items-center justify-end gap-2">
      <label htmlFor="car-switcher" className="text-sm muted">Carro</label>
      <select id="car-switcher" className="input !w-auto max-w-[60%]" value={activeId ?? ''} onChange={(e) => onChange(e.target.value)}>
        {cars.map((c) => (
          <option key={c.id} value={c.id}>
            {c.name}
          </option>
        ))}
      </select>
    </div>
  )
}
