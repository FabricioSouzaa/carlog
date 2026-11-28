import { useId } from 'react'
import type { Car } from '../types'

const chip = 'inline-flex max-w-[11rem] items-center gap-2 rounded-xl border border-line bg-surface px-3 py-1.5 text-[13px] font-semibold text-ink'
const dot = <span aria-hidden="true" className="h-2 w-2 shrink-0 rounded-full bg-blue-600" />

/** O carro em uso, sempre à vista. Com um carro só é um selo; com 2 ou mais vira uma lista para trocar. */
export function CarSwitcher({ cars, activeId, onChange }: { cars: Car[]; activeId: string | undefined; onChange: (id: string) => void }) {
  const id = useId() // o seletor aparece no topo (celular) e na barra (computador): cada cópia precisa do seu id
  const active = cars.find((c) => c.id === activeId)
  if (!active) return null
  if (cars.length < 2) {
    return (
      <span className={chip}>
        {dot}
        <span className="truncate">{active.name}</span>
      </span>
    )
  }
  return (
    <span className="relative inline-flex max-w-[11rem]">
      <label htmlFor={id} className="sr-only">Carro</label>
      <span className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2">{dot}</span>
      <select
        id={id}
        className="w-full appearance-none truncate rounded-xl border border-line bg-surface py-1.5 pr-8 pl-7 text-[13px] font-semibold text-ink outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/30"
        value={active.id}
        onChange={(e) => onChange(e.target.value)}
      >
        {cars.map((c) => (
          <option key={c.id} value={c.id}>
            {c.name}
          </option>
        ))}
      </select>
      <span aria-hidden="true" className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-[10px] text-ink-soft">▾</span>
    </span>
  )
}
