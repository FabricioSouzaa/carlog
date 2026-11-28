import { useEffect, type ReactNode } from 'react'
import { EXPENSE_TYPE_LABEL, type ExpenseType } from '../types'

export function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', onKey)
      document.body.style.overflow = prevOverflow
    }
  }, [onClose])

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 sm:items-center"
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="flex max-h-[85dvh] w-full flex-col rounded-t-3xl border border-line bg-surface shadow-xl sm:max-w-lg sm:rounded-3xl"
      >
        <div className="flex shrink-0 items-center justify-between px-5 pt-4 pb-2">
          <h2 className="text-lg font-semibold">{title}</h2>
          <button type="button" className="btn-ghost" onClick={onClose} aria-label="Fechar">
            ✕
          </button>
        </div>
        <div className="overflow-y-auto overscroll-contain px-5 pb-5">{children}</div>
      </div>
    </div>
  )
}

const TYPE_STYLE: Record<ExpenseType, string> = {
  maintenance: 'bg-blue-100 text-blue-800 night:bg-blue-950 night:text-blue-300',
  upgrade: 'bg-orange-100 text-orange-800 night:bg-orange-950 night:text-orange-300',
  routine: 'bg-emerald-100 text-emerald-800 night:bg-emerald-950 night:text-emerald-300',
}

export function TypeBadge({ type }: { type: ExpenseType }) {
  return (
    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${TYPE_STYLE[type]}`}>
      {EXPENSE_TYPE_LABEL[type]}
    </span>
  )
}

export function Fab({ onClick, children }: { onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="fixed right-4 bottom-20 z-30 rounded-full bg-blue-600 px-5 py-3 text-sm font-semibold text-white shadow-lg hover:bg-blue-700 md:bottom-6"
    >
      {children}
    </button>
  )
}

export function EmptyState({ children }: { children: ReactNode }) {
  return <p className="card py-10 text-center text-ink-soft">{children}</p>
}

/** Aviso em destaque: vermelho para erro (lido na hora por leitores de tela), verde para sucesso. */
export function Notice({ tone, children }: { tone: 'ok' | 'error'; children: ReactNode }) {
  const error = tone === 'error'
  return (
    <div
      role={error ? 'alert' : 'status'}
      className={`flex items-start gap-3 rounded-xl border p-4 text-sm font-medium ${
        error
          ? 'border-red-300 bg-red-50 text-red-800 night:border-red-900 night:bg-red-950 night:text-red-200'
          : 'border-green-300 bg-green-50 text-green-800 night:border-green-900 night:bg-green-950 night:text-green-200'
      }`}
    >
      <span aria-hidden="true" className="mt-px">{error ? '⚠️' : '✅'}</span>
      <p>{children}</p>
    </div>
  )
}
