import { useEffect, useRef, useState, type ChangeEvent, type FormEvent } from 'react'
import { compressImage } from '../lib/image'
import { parseMoney, todayISO } from '../lib/format'
import { newId } from '../lib/id'
import { DESCRIPTION_MAX, MAX_ATTACHMENTS, NOTES_MAX } from '../lib/limits'
import { saveImage } from '../storage/images'
import type { ExpenseInput } from '../useData'
import { EXPENSE_TYPE_HINT, EXPENSE_TYPE_LABEL, type Category, type ExpenseType } from '../types'
import { StoredImage } from './StoredImage'
import { Modal } from './ui'

const TYPES: ExpenseType[] = ['maintenance', 'upgrade', 'routine']

interface NewPhoto {
  id: string
  blob: Blob
  url: string // object URL só para a prévia
}

interface Props {
  title: string
  submitLabel?: string
  categories: Category[]
  initial?: Partial<ExpenseInput>
  onSubmit: (input: ExpenseInput) => void
  onClose: () => void
}

export function ExpenseForm({ title, submitLabel = 'Salvar', categories, initial, onSubmit, onClose }: Props) {
  const [description, setDescription] = useState(initial?.description ?? '')
  const [amount, setAmount] = useState(initial?.amount != null ? String(initial.amount).replace('.', ',') : '')
  const [date, setDate] = useState(initial?.date ?? todayISO())
  const [categoryId, setCategoryId] = useState(initial?.categoryId ?? categories[0]?.id ?? '')
  const [type, setType] = useState<ExpenseType>(initial?.type ?? 'routine')
  const [odometer, setOdometer] = useState(initial?.odometer != null ? String(initial.odometer) : '')
  const [notes, setNotes] = useState(initial?.notes ?? '')
  const [error, setError] = useState('')
  const [kept, setKept] = useState<string[]>(initial?.attachments ?? [])
  const [added, setAdded] = useState<NewPhoto[]>([])
  const [busy, setBusy] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)
  const addedRef = useRef(added)
  useEffect(() => {
    addedRef.current = added
  }, [added])

  // libera as URLs de prévia ao fechar o formulário
  useEffect(() => () => addedRef.current.forEach((p) => URL.revokeObjectURL(p.url)), [])

  async function handleFiles(e: ChangeEvent<HTMLInputElement>) {
    const files = [...(e.target.files ?? [])]
    e.target.value = ''
    const room = MAX_ATTACHMENTS - kept.length - added.length
    if (files.length > room) setError(`Máximo de ${MAX_ATTACHMENTS} fotos por gasto.`)
    else setError('')
    setBusy(true)
    try {
      const next: NewPhoto[] = []
      for (const file of files.slice(0, Math.max(room, 0))) {
        const blob = await compressImage(file)
        next.push({ id: newId(), blob, url: URL.createObjectURL(blob) })
      }
      setAdded((prev) => [...prev, ...next])
    } catch {
      setError('Não foi possível usar essa imagem. Tente outra foto.')
    } finally {
      setBusy(false)
    }
  }

  function removeAdded(id: string) {
    setAdded((prev) => {
      prev.filter((p) => p.id === id).forEach((p) => URL.revokeObjectURL(p.url))
      return prev.filter((p) => p.id !== id)
    })
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (busy) return
    const value = parseMoney(amount)
    if (!description.trim()) return setError('Informe uma descrição.')
    if (description.trim().length > DESCRIPTION_MAX) return setError(`Descrição muito longa (máximo ${DESCRIPTION_MAX} caracteres).`)
    if (notes.length > NOTES_MAX) return setError(`Observações muito longas (máximo ${NOTES_MAX} caracteres).`)
    if (value === null || value <= 0) return setError('Informe um valor maior que zero.')
    if (!date) return setError('Informe a data.')
    const km = odometer.trim() ? Number(odometer.replace(/\./g, '')) : undefined
    if (km !== undefined && (!Number.isFinite(km) || km < 0)) return setError('Quilometragem inválida.')
    setBusy(true)
    try {
      for (const p of added) await saveImage(p.id, p.blob)
    } catch {
      setBusy(false)
      return setError('Não foi possível salvar as fotos neste navegador. Remova-as e tente de novo.')
    }
    const attachments = [...kept, ...added.map((p) => p.id)]
    onSubmit({
      description: description.trim(),
      amount: value,
      date,
      categoryId,
      type,
      odometer: km,
      notes: notes.trim() || undefined,
      attachments: attachments.length > 0 ? attachments : undefined,
    })
    // as fotos removidas na edição são apagadas por useData.updateExpense, só depois de o banco confirmar
    onClose()
  }

  return (
    <Modal title={title} onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-3">
        <div>
          <label className="label" htmlFor="desc">Descrição</label>
          <input id="desc" className="input" maxLength={DESCRIPTION_MAX} value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Ex.: Troca de óleo" autoFocus />
        </div>
        <div className="grid grid-cols-2 gap-3 [&>*]:min-w-0">
          <div>
            <label className="label" htmlFor="amount">Valor (R$)</label>
            <input id="amount" className="input" inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0,00" />
          </div>
          <div>
            <label className="label" htmlFor="date">Data</label>
            <input id="date" type="date" className="input" value={date} onChange={(e) => setDate(e.target.value)} />
          </div>
        </div>
        <div>
          <label className="label" htmlFor="cat">Categoria</label>
          <select id="cat" className="input" value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>
        <div>
          <span className="label">Tipo</span>
          <div className="grid grid-cols-3 gap-2">
            {TYPES.map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setType(t)}
                aria-pressed={type === t}
                className={`rounded-lg border px-2 py-2 text-sm font-medium ${
                  type === t
                    ? 'border-blue-600 bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300'
                    : 'border-slate-300 text-slate-600 dark:border-slate-700 dark:text-slate-300'
                }`}
              >
                {EXPENSE_TYPE_LABEL[t]}
              </button>
            ))}
          </div>
          <p className="muted mt-1">{EXPENSE_TYPE_HINT[type]}</p>
        </div>
        <div>
          <label className="label" htmlFor="km">Quilometragem (opcional)</label>
          <input id="km" className="input" inputMode="numeric" value={odometer} onChange={(e) => setOdometer(e.target.value)} placeholder="Ex.: 45000" />
        </div>
        <div>
          <label className="label" htmlFor="notes">Observações (opcional)</label>
          <textarea id="notes" className="input" rows={2} maxLength={NOTES_MAX} value={notes} onChange={(e) => setNotes(e.target.value)} />
        </div>
        <div>
          <span className="label">Fotos / nota fiscal (opcional)</span>
          <div className="flex flex-wrap gap-2">
            {kept.map((id, i) => (
              <div key={id} className="relative">
                <StoredImage id={id} alt={`Foto ${i + 1}`} className="h-16 w-16 rounded-lg object-cover" />
                <button type="button" onClick={() => setKept((k) => k.filter((x) => x !== id))} aria-label={`Remover foto ${i + 1}`} className="absolute -top-2 -right-2 flex h-6 w-6 items-center justify-center rounded-full bg-slate-800 text-xs text-white">✕</button>
              </div>
            ))}
            {added.map((p, i) => (
              <div key={p.id} className="relative">
                <img src={p.url} alt={`Nova foto ${i + 1}`} className="h-16 w-16 rounded-lg object-cover" />
                <button type="button" onClick={() => removeAdded(p.id)} aria-label={`Remover nova foto ${i + 1}`} className="absolute -top-2 -right-2 flex h-6 w-6 items-center justify-center rounded-full bg-slate-800 text-xs text-white">✕</button>
              </div>
            ))}
            {kept.length + added.length < MAX_ATTACHMENTS && (
              <button type="button" onClick={() => fileRef.current?.click()} disabled={busy} className="flex h-16 w-16 flex-col items-center justify-center rounded-lg border border-dashed border-slate-400 text-xs text-slate-500 disabled:opacity-50 dark:border-slate-600 dark:text-slate-400">
                <span className="text-xl leading-none">{busy ? '…' : '📷'}</span>
                {busy ? 'Lendo' : 'Adicionar'}
              </button>
            )}
          </div>
          <input ref={fileRef} type="file" accept="image/*" multiple className="hidden" onChange={handleFiles} />
          <p className="muted mt-1">Tire uma foto ou escolha da galeria. Até {MAX_ATTACHMENTS} imagens, reduzidas automaticamente.</p>
        </div>
        {error && <p role="alert" className="text-sm text-red-600 dark:text-red-400">{error}</p>}
        <div className="sticky bottom-0 -mx-5 -mb-5 flex justify-end gap-2 border-t border-slate-200 bg-white px-5 py-3 dark:border-slate-800 dark:bg-slate-900">
          <button type="button" className="btn-ghost" onClick={onClose}>Cancelar</button>
          <button type="submit" className="btn-primary" disabled={busy}>{busy ? 'Salvando…' : submitLabel}</button>
        </div>
      </form>
    </Modal>
  )
}
