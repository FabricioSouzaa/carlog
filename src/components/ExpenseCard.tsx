import { useState } from 'react'
import { formatCurrency, formatDate, formatKm } from '../lib/format'
import type { Category, Expense } from '../types'
import { StoredImage } from './StoredImage'
import { Modal, TypeBadge } from './ui'

interface Props {
  expense: Expense
  category?: Category
  onEdit: () => void
  onDelete: () => void
}

export function ExpenseCard({ expense, category, onEdit, onDelete }: Props) {
  const [viewing, setViewing] = useState<string | null>(null)
  return (
    <article className="card">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="truncate font-semibold">{expense.description}</h3>
          <p className="muted">
            {formatDate(expense.date)} · {category?.name ?? 'Sem categoria'}
            {expense.odometer != null && ` · ${formatKm(expense.odometer)}`}
          </p>
        </div>
        <p className="shrink-0 text-lg font-bold tabular-nums">{formatCurrency(expense.amount)}</p>
      </div>
      {expense.notes && <p className="mt-2 text-sm text-ink-soft">{expense.notes}</p>}
      {expense.attachments && expense.attachments.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-2">
          {expense.attachments.map((id, i) => (
            <button key={id} type="button" onClick={() => setViewing(id)} aria-label={`Ver foto ${i + 1}`} className="overflow-hidden rounded-lg border border-line">
              <StoredImage id={id} alt={`Foto ${i + 1} de ${expense.description}`} className="h-14 w-14 object-cover" />
            </button>
          ))}
        </div>
      )}
      <div className="mt-3 flex items-center justify-between">
        <TypeBadge type={expense.type} />
        <div className="flex gap-1">
          <button type="button" className="btn-ghost" onClick={onEdit}>Editar</button>
          <button type="button" className="btn-danger" onClick={onDelete}>Excluir</button>
        </div>
      </div>
      {viewing && (
        <Modal title={expense.description} onClose={() => setViewing(null)}>
          <StoredImage id={viewing} alt={`Foto de ${expense.description}`} className="max-h-[65dvh] w-full rounded-lg object-contain" />
        </Modal>
      )}
    </article>
  )
}
