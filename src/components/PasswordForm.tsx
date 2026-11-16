import { useState, type FormEvent } from 'react'
import { passwordProblem, passwordUpdateError } from '../lib/password'
import { supabase } from '../supabase'

interface Props {
  /** `othersSignedOut`: false se a senha mudou mas não foi possível desconectar os outros aparelhos */
  onSuccess: (result: { othersSignedOut: boolean }) => void
  onCancel?: () => void
  cancelLabel?: string
}

export function PasswordForm({ onSuccess, onCancel, cancelLabel = 'Cancelar' }: Props) {
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    const problem = passwordProblem(password, confirm)
    if (problem) return setError(problem)
    setBusy(true)
    setError('')
    try {
      const { error: updateError } = await supabase.auth.updateUser({ password })
      if (updateError) setError(passwordUpdateError(updateError))
      else {
        // quem ficou com uma sessão aberta (ou roubada) em outro aparelho perde o acesso; esta sessão continua
        // (o supabase-js devolve o erro em vez de lançar; rede fora do ar lança)
        const others = await supabase.auth.signOut({ scope: 'others' }).catch(() => ({ error: new Error('offline') }))
        onSuccess({ othersSignedOut: !others.error })
      }
    } catch {
      setError('Não foi possível falar com o servidor. Verifique a conexão e tente novamente.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div>
        <label className="label" htmlFor="new-password">Nova senha</label>
        <input id="new-password" type="password" autoComplete="new-password" className="input" value={password} onChange={(e) => setPassword(e.target.value)} />
      </div>
      <div>
        <label className="label" htmlFor="confirm-password">Repita a nova senha</label>
        <input id="confirm-password" type="password" autoComplete="new-password" className="input" value={confirm} onChange={(e) => setConfirm(e.target.value)} />
      </div>
      {error && <p role="alert" className="text-sm text-red-600 dark:text-red-400">{error}</p>}
      <div className="flex gap-2">
        <button type="submit" className="btn-primary" disabled={busy}>{busy ? 'Salvando…' : 'Salvar nova senha'}</button>
        {onCancel && <button type="button" className="btn-ghost" onClick={onCancel}>{cancelLabel}</button>}
      </div>
    </form>
  )
}
