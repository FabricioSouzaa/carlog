import { useRef, useState } from 'react'
import { PasswordForm } from '../components/PasswordForm'
import { isAppData } from '../storage/backup'
import { loadLegacyData, markLegacyMigrated } from '../storage/legacy'
import { supabase } from '../supabase'
import { todayISO } from '../lib/format'
import type { DataApi } from '../useData'

export function Ajustes({ api, email }: { api: DataApi; email: string }) {
  const { data } = api
  const [newName, setNewName] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editName, setEditName] = useState('')
  const [message, setMessage] = useState('')
  const [busy, setBusy] = useState(false)
  const [changingPassword, setChangingPassword] = useState(false)
  const [legacy, setLegacy] = useState(loadLegacyData)
  const fileRef = useRef<HTMLInputElement>(null)

  const nameTaken = (name: string, exceptId?: string) =>
    data.categories.some((c) => c.id !== exceptId && c.name.toLowerCase() === name.toLowerCase())

  function addCategory() {
    const name = newName.trim()
    if (!name) return
    if (nameTaken(name)) return setMessage('Já existe uma categoria com esse nome.')
    api.addCategory(name)
    setNewName('')
    setMessage('')
  }

  function saveRename(id: string) {
    const name = editName.trim()
    if (!name) return
    if (nameTaken(name, id)) return setMessage('Já existe uma categoria com esse nome.')
    api.renameCategory(id, name)
    setEditingId(null)
    setMessage('')
  }

  function remove(id: string, name: string) {
    const used = data.expenses.filter((e) => e.categoryId === id).length + data.planned.filter((p) => p.categoryId === id).length
    const extra = used > 0 ? ` Os ${used} lançamentos dela vão para "Outros".` : ''
    if (window.confirm(`Remover a categoria "${name}"?${extra}`)) api.removeCategory(id)
  }

  function exportJson() {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `carlog-${todayISO()}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  async function importJson(file: File) {
    setBusy(true)
    try {
      const parsed: unknown = JSON.parse(await file.text())
      if (!isAppData(parsed)) throw new Error('formato')
      const r = await api.importData(parsed)
      setMessage(`Backup importado: ${r.expenses} gastos e ${r.planned} planejados adicionados.`)
    } catch {
      setMessage('Não foi possível importar. Use um backup exportado por este app.')
    } finally {
      setBusy(false)
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  async function migrateLegacy() {
    if (!legacy) return
    setBusy(true)
    try {
      const r = await api.importData(legacy, { withLegacyImages: true })
      markLegacyMigrated()
      setLegacy(null)
      setMessage(
        `Enviado para sua conta: ${r.expenses} gastos, ${r.planned} planejados e ${r.photos} fotos.` +
          (r.photosSkipped ? ` ${r.photosSkipped} foto(s) não puderam ser enviadas (acima de 3 MB ou fora do formato JPEG).` : ''),
      )
    } catch {
      setMessage('Não foi possível enviar os dados. Nada foi apagado deste navegador; tente de novo.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Ajustes</h1>
      {message && <p role="status" className="card text-sm">{message}</p>}

      <section className="card space-y-3">
        <h2 className="font-semibold">Categorias</h2>
        <ul className="divide-y divide-slate-100 dark:divide-slate-800">
          {data.categories.map((c) => (
            <li key={c.id} className="flex items-center justify-between gap-2 py-2">
              {editingId === c.id ? (
                <>
                  <input className="input" value={editName} onChange={(e) => setEditName(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && saveRename(c.id)} aria-label="Novo nome" autoFocus />
                  <button type="button" className="btn-primary" onClick={() => saveRename(c.id)}>Salvar</button>
                  <button type="button" className="btn-ghost" onClick={() => setEditingId(null)}>Cancelar</button>
                </>
              ) : (
                <>
                  <span className="truncate">{c.name}</span>
                  <span className="flex shrink-0 gap-1">
                    <button type="button" className="btn-ghost" onClick={() => { setEditingId(c.id); setEditName(c.name) }}>Renomear</button>
                    {!c.isFallback && (
                      <button type="button" className="btn-danger" onClick={() => remove(c.id, c.name)}>Remover</button>
                    )}
                  </span>
                </>
              )}
            </li>
          ))}
        </ul>
        <div className="flex gap-2">
          <input className="input" value={newName} onChange={(e) => setNewName(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && addCategory()} placeholder="Nova categoria" aria-label="Nova categoria" />
          <button type="button" className="btn-primary" onClick={addCategory}>Adicionar</button>
        </div>
      </section>

      {legacy && (
        <section className="card space-y-3 border-blue-300 dark:border-blue-800">
          <h2 className="font-semibold">Dados deste navegador</h2>
          <p className="muted">
            Encontrei {legacy.expenses.length} gastos e {legacy.planned.length} planejados salvos só neste aparelho. Envie para a sua conta para vê-los em todos os dispositivos. Nada é apagado daqui.
          </p>
          <button type="button" className="btn-primary" onClick={migrateLegacy} disabled={busy}>{busy ? 'Enviando…' : 'Enviar para minha conta'}</button>
        </section>
      )}

      <section className="card space-y-3">
        <h2 className="font-semibold">Backup dos dados</h2>
        <p className="muted">Seus dados ficam na nuvem. O backup JSON é uma cópia extra (sem as fotos). Importar adiciona ao que já existe, sem apagar nada.</p>
        <div className="flex flex-wrap gap-2">
          <button type="button" className="btn-outline" onClick={exportJson}>Exportar JSON</button>
          <button type="button" className="btn-outline" onClick={() => fileRef.current?.click()} disabled={busy}>Importar JSON</button>
          <input ref={fileRef} type="file" accept="application/json,.json" className="hidden" onChange={(e) => e.target.files?.[0] && importJson(e.target.files[0])} />
        </div>
      </section>
    
      <section className="card space-y-3">
        <h2 className="font-semibold">Conta</h2>
        <p className="muted">Conectado como {email}</p>
        {changingPassword ? (
          <PasswordForm
            onSuccess={() => {
              setChangingPassword(false)
              setMessage('Senha alterada com sucesso.')
              window.scrollTo({ top: 0 })
            }}
            onCancel={() => setChangingPassword(false)}
          />
        ) : (
          <div className="flex flex-wrap gap-2">
            <button type="button" className="btn-outline" onClick={() => setChangingPassword(true)}>Alterar senha</button>
            <button type="button" className="btn-outline" onClick={() => supabase.auth.signOut()}>Sair</button>
          </div>
        )}
      </section>
    </div>
  )
}
