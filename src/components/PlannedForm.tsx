import { useState, type FormEvent } from 'react'
import { parseMoney } from '../lib/format'
import { DESCRIPTION_MAX, NOTES_MAX } from '../lib/limits'
import type { PlannedInput } from '../useData'
import {
  EXPENSE_TYPE_LABEL,
  PRIORITY_LABEL,
  type Category,
  type ExpenseType,
  type PlannedExpense,
  type Priority,
} from '../types'
import { Modal } from './ui'

const TYPES: ExpenseType[] = ['maintenance', 'upgrade', 'routine']
const PRIORITIES: Priority[] = ['low', 'medium', 'high']
const asText = (n?: number) => (n != null ? String(n).replace('.', ',') : '')

interface Props {
  categories: Category[]
  initial?: PlannedExpense
  onSubmit: (input: PlannedInput) => void
  onClose: () => void
}

export function PlannedForm({ categories, initial, onSubmit, onClose }: Props) {
  const [description, setDescription] = useState(initial?.description ?? '')
  const [estimated, setEstimated] = useState(asText(initial?.estimatedAmount))
  const [max, setMax] = useState(asText(initial?.estimatedMax))
  const [categoryId, setCategoryId] = useState(initial?.categoryId ?? categories[0]?.id ?? '')
  const [type, setType] = useState<ExpenseType>(initial?.type ?? 'upgrade')
  const [priority, setPriority] = useState<Priority>(initial?.priority ?? 'medium')
  const [notes, setNotes] = useState(initial?.notes ?? '')
  const [error, setError] = useState('')

  function handleSubmit(e: FormEvent) {
    e.preventDefault()
    const min = parseMoney(estimated)
    const hi = max.trim() ? parseMoney(max) : null
    if (!description.trim()) return setError('Informe uma descrição.')
    if (description.trim().length > DESCRIPTION_MAX) return setError(`Descrição muito longa (máximo ${DESCRIPTION_MAX} caracteres).`)
    if (notes.length > NOTES_MAX) return setError(`Observações muito longas (máximo ${NOTES_MAX} caracteres).`)
    if (min === null || min <= 0) return setError('Informe o valor estimado.')
    if (max.trim() && (hi === null || hi < min)) return setError('O valor máximo deve ser maior ou igual ao estimado.')
    onSubmit({
      description: description.trim(),
      estimatedAmount: min,
      estimatedMax: hi && hi > min ? hi : undefined,
      categoryId,
      type,
      priority,
      notes: notes.trim() || undefined,
    })
    onClose()
  }

  return (
    <Modal title={initial ? 'Editar gasto planejado' : 'Planejar gasto'} onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-3">
        <div>
          <label className="label" htmlFor="p-desc">O que você quer fazer?</label>
          <input id="p-desc" className="input" maxLength={DESCRIPTION_MAX} value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Ex.: Trocar faróis para LED" autoFocus />
        </div>
        <div className="grid grid-cols-2 gap-3 [&>*]:min-w-0">
          <div>
            <label className="label" htmlFor="p-est">Valor estimado (R$)</label>
            <input id="p-est" className="input" inputMode="decimal" value={estimated} onChange={(e) => setEstimated(e.target.value)} placeholder="0,00" />
          </div>
          <div>
            <label className="label" htmlFor="p-max">Até (opcional)</label>
            <input id="p-max" className="input" inputMode="decimal" value={max} onChange={(e) => setMax(e.target.value)} placeholder="Faixa de preço" />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3 [&>*]:min-w-0">
          <div>
            <label className="label" htmlFor="p-cat">Categoria</label>
            <select id="p-cat" className="input" value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="label" htmlFor="p-type">Tipo</label>
            <select id="p-type" className="input" value={type} onChange={(e) => setType(e.target.value as ExpenseType)}>
              {TYPES.map((t) => (
                <option key={t} value={t}>{EXPENSE_TYPE_LABEL[t]}</option>
              ))}
            </select>
          </div>
        </div>
        <div>
          <span className="label">Prioridade</span>
          <div className="grid grid-cols-3 gap-2">
            {PRIORITIES.map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => setPriority(p)}
                aria-pressed={priority === p}
                className={`rounded-lg border px-2 py-2 text-sm font-medium ${
                  priority === p
                    ? 'border-blue-600 bg-wash text-wash-ink'
                    : 'border-line-strong text-ink-soft'
                }`}
              >
                {PRIORITY_LABEL[p]}
              </button>
            ))}
          </div>
        </div>
        <div>
          <label className="label" htmlFor="p-notes">Observações ou link (opcional)</label>
          <textarea id="p-notes" className="input" rows={2} maxLength={NOTES_MAX} value={notes} onChange={(e) => setNotes(e.target.value)} />
        </div>
        {error && <p role="alert" className="text-sm text-red-600 night:text-red-400">{error}</p>}
        <div className="sticky bottom-0 -mx-5 -mb-5 flex justify-end gap-2 border-t border-line bg-surface px-5 py-3">
          <button type="button" className="btn-ghost" onClick={onClose}>Cancelar</button>
          <button type="submit" className="btn-primary">Salvar</button>
        </div>
      </form>
    </Modal>
  )
}
