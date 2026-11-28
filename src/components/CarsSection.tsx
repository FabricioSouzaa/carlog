import { useState } from 'react'
import { deleteCarBlocker } from '../lib/cars'
import { CAR_NAME_MAX } from '../lib/limits'
import type { Car } from '../types'
import type { DataApi } from '../useData'

const MIN_YEAR = 1900
const MAX_YEAR = 2100

interface Draft {
  name: string
  model: string
  year: string
}
const EMPTY: Draft = { name: '', model: '', year: '' }
const toDraft = (c: Car): Draft => ({ name: c.name, model: c.model ?? '', year: c.year != null ? String(c.year) : '' })

function CarFields({ draft, onChange, onEnter }: { draft: Draft; onChange: (d: Draft) => void; onEnter: () => void }) {
  const key = (e: React.KeyboardEvent) => e.key === 'Enter' && onEnter()
  return (
    <div className="grid flex-1 grid-cols-1 gap-2 sm:grid-cols-[2fr_2fr_1fr]">
      <input className="input" maxLength={CAR_NAME_MAX} value={draft.name} onChange={(e) => onChange({ ...draft, name: e.target.value })} onKeyDown={key} placeholder="Nome (ex.: Civic)" aria-label="Nome do carro" />
      <input className="input" maxLength={CAR_NAME_MAX} value={draft.model} onChange={(e) => onChange({ ...draft, model: e.target.value })} onKeyDown={key} placeholder="Modelo (opcional)" aria-label="Modelo do carro" />
      <input className="input" inputMode="numeric" maxLength={4} value={draft.year} onChange={(e) => onChange({ ...draft, year: e.target.value.replace(/\D/g, '') })} onKeyDown={key} placeholder="Ano" aria-label="Ano do carro" />
    </div>
  )
}

export function CarsSection({ api, onMessage }: { api: DataApi; onMessage: (text: string, error?: boolean) => void }) {
  const { cars } = api.allData
  const [adding, setAdding] = useState<Draft>(EMPTY)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editing, setEditing] = useState<Draft>(EMPTY)

  /** Confere o rascunho; devolve os dados prontos ou mostra o problema. */
  function parse(d: Draft, exceptId?: string): Omit<Car, 'id'> | null {
    const name = d.name.trim()
    if (!name) return onMessage('Informe o nome do carro.', true), null
    if (cars.some((c) => c.id !== exceptId && c.name.trim().toLowerCase() === name.toLowerCase())) {
      return onMessage('Já existe um carro com esse nome.', true), null
    }
    const year = d.year ? Number(d.year) : undefined
    if (year !== undefined && (year < MIN_YEAR || year > MAX_YEAR)) return onMessage(`Ano inválido (entre ${MIN_YEAR} e ${MAX_YEAR}).`, true), null
    return { name, model: d.model.trim() || undefined, year }
  }

  function add() {
    const input = parse(adding)
    if (!input) return
    api.addCar(input)
    setAdding(EMPTY)
    onMessage('')
  }

  function save(id: string) {
    const input = parse(editing, id)
    if (!input) return
    api.updateCar(id, input)
    setEditingId(null)
    onMessage('')
  }

  function remove(c: Car) {
    // o motivo aparece antes de perguntar: não faz sentido confirmar algo que será recusado
    const blocker = deleteCarBlocker(cars, c.id, api.allData)
    if (blocker) return onMessage(blocker, true)
    if (!window.confirm(`Remover o carro "${c.name}"?`)) return
    onMessage(api.deleteCar(c.id) ?? '', false)
  }

  return (
    <section className="card space-y-3">
      <h2 className="font-semibold">Carros</h2>
      <p className="muted">As telas mostram um carro por vez (o escolhido no topo, quando há mais de um). As categorias valem para todos.</p>
      <ul className="divide-y divide-rule">
        {cars.map((c) => (
          <li key={c.id} className="flex flex-wrap items-center justify-between gap-2 py-2">
            {editingId === c.id ? (
              <>
                <CarFields draft={editing} onChange={setEditing} onEnter={() => save(c.id)} />
                <span className="flex gap-1">
                  <button type="button" className="btn-primary" onClick={() => save(c.id)}>Salvar</button>
                  <button type="button" className="btn-ghost" onClick={() => setEditingId(null)}>Cancelar</button>
                </span>
              </>
            ) : (
              <>
                <span className="min-w-0">
                  <span className="block truncate">
                    {c.name}
                    {c.id === api.activeCarId && cars.length > 1 && <span className="ml-2 text-xs muted">(em uso)</span>}
                  </span>
                  {(c.model || c.year) && <span className="block truncate text-sm muted">{[c.model, c.year].filter(Boolean).join(' · ')}</span>}
                </span>
                <span className="flex shrink-0 gap-1">
                  <button type="button" className="btn-ghost" onClick={() => { setEditingId(c.id); setEditing(toDraft(c)) }}>Editar</button>
                  {cars.length > 1 && <button type="button" className="btn-danger" onClick={() => remove(c)}>Remover</button>}
                </span>
              </>
            )}
          </li>
        ))}
      </ul>
      <div className="flex flex-col gap-2 sm:flex-row">
        <CarFields draft={adding} onChange={setAdding} onEnter={add} />
        <button type="button" className="btn-primary" onClick={add}>Adicionar carro</button>
      </div>
    </section>
  )
}
