import { useRef, useState } from 'react'
import { CarsSection } from '../components/CarsSection'
import { PasswordForm } from '../components/PasswordForm'
import { Notice } from '../components/ui'
import { validateBackup } from '../lib/backup'
import { CATEGORY_NAME_MAX, MAX_BACKUP_BYTES } from '../lib/limits'
import { clearMigratedCopy, hasMigratedCopy, loadLegacyData, markLegacyMigrated } from '../storage/legacy'
import { supabase } from '../supabase'
import { todayISO } from '../lib/format'
import type { DataApi } from '../useData'

export function Ajustes({ api, email }: { api: DataApi; email: string }) {
  const { data } = api
  const [newName, setNewName] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editName, setEditName] = useState('')
  const [notice, setNotice] = useState<{ text: string; error: boolean } | null>(null)
  const setMessage = (text: string, error = false) => setNotice(text ? { text, error } : null)
  const [busy, setBusy] = useState(false)
  const [changingPassword, setChangingPassword] = useState(false)
  const [legacy, setLegacy] = useState(loadLegacyData)
  const [migratedCopy, setMigratedCopy] = useState(hasMigratedCopy)
  const activeCarName = data.cars.find((c) => c.id === api.activeCarId)?.name ?? ''
  const fileRef = useRef<HTMLInputElement>(null)

  const nameTaken = (name: string, exceptId?: string) =>
    data.categories.some((c) => c.id !== exceptId && c.name.toLowerCase() === name.toLowerCase())

  function addCategory() {
    const name = newName.trim()
    if (!name) return
    if (nameTaken(name)) return setMessage('Já existe uma categoria com esse nome.', true)
    api.addCategory(name)
    setNewName('')
    setMessage('')
  }

  function saveRename(id: string) {
    const name = editName.trim()
    if (!name) return
    if (nameTaken(name, id)) return setMessage('Já existe uma categoria com esse nome.', true)
    api.renameCategory(id, name)
    setEditingId(null)
    setMessage('')
  }

  function remove(id: string, name: string) {
    const all = api.allData // categorias são da conta: conta os lançamentos de todos os carros
    const used = all.expenses.filter((e) => e.categoryId === id).length + all.planned.filter((p) => p.categoryId === id).length
    const extra = used > 0 ? ` Os ${used} lançamentos dela vão para "Outros".` : ''
    if (window.confirm(`Remover a categoria "${name}"?${extra}`)) api.removeCategory(id)
  }

  function exportJson() {
    const blob = new Blob([JSON.stringify(api.allData, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `carlog-${todayISO()}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  async function importJson(file: File) {
    if (file.size > MAX_BACKUP_BYTES) {
      if (fileRef.current) fileRef.current.value = ''
      return setMessage(`Arquivo grande demais para um backup (máximo ${MAX_BACKUP_BYTES / 1024 / 1024} MB).`, true)
    }
    setBusy(true)
    try {
      let parsed: unknown
      try {
        parsed = JSON.parse(await file.text())
      } catch {
        return setMessage('Esse arquivo não é um JSON válido. Use um backup exportado por este app.', true)
      }
      const check = validateBackup(parsed)
      if (!check.ok) return setMessage(`Não foi possível importar. ${check.error}`, true)
      const r = await api.importData(check.data)
      setMessage(`Backup importado: ${r.expenses} gastos e ${r.planned} planejados adicionados.`)
    } catch {
      setMessage('A importação falhou e pode ter ficado pela metade. Confira Gastos e Planejados antes de tentar de novo, para não duplicar.', true)
    } finally {
      setBusy(false)
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  async function migrateLegacy() {
    if (!legacy) return
    const check = validateBackup(legacy)
    if (!check.ok) return setMessage(`Não foi possível enviar os dados antigos. ${check.error} Nada foi apagado deste navegador.`, true)
    setBusy(true)
    try {
      const r = await api.importData(check.data, { withLegacyImages: true })
      markLegacyMigrated()
      setLegacy(null)
      setMigratedCopy(hasMigratedCopy())
      setMessage(
        `Enviado para sua conta: ${r.expenses} gastos, ${r.planned} planejados e ${r.photos} fotos.` +
          (r.photosSkipped ? ` ${r.photosSkipped} foto(s) não puderam ser enviadas (acima de 3 MB ou fora do formato JPEG).` : ''),
      )
    } catch {
      setMessage('Não foi possível enviar os dados e o envio pode ter ficado pela metade. Nada foi apagado deste navegador; confira Gastos e Planejados antes de tentar de novo, para não duplicar.', true)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Ajustes</h1>
      {notice && <Notice tone={notice.error ? 'error' : 'ok'}>{notice.text}</Notice>}

      <CarsSection api={api} onMessage={setMessage} />

      <section className="card space-y-3">
        <h2 className="font-semibold">Categorias</h2>
        <ul className="divide-y divide-slate-100 dark:divide-slate-800">
          {data.categories.map((c) => (
            <li key={c.id} className="flex items-center justify-between gap-2 py-2">
              {editingId === c.id ? (
                <>
                  <input className="input" maxLength={CATEGORY_NAME_MAX} value={editName} onChange={(e) => setEditName(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && saveRename(c.id)} aria-label="Novo nome" autoFocus />
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
          <input className="input" maxLength={CATEGORY_NAME_MAX} value={newName} onChange={(e) => setNewName(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && addCategory()} placeholder="Nova categoria" aria-label="Nova categoria" />
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

      {migratedCopy && !legacy && (
        <section className="card space-y-3">
          <h2 className="font-semibold">Cópia dos dados antigos</h2>
          <p className="muted">Depois do envio, este navegador guardou uma cópia em texto dos dados antigos (as fotos antigas deste aparelho não entram aqui e não são apagadas). É a única volta caso algo tenha ficado de fora do envio, então só apague depois de conferir tudo na sua conta.</p>
          <button
            type="button"
            className="btn-outline"
            onClick={() => {
              if (!window.confirm('Apagar a cópia dos dados antigos deste navegador? Os dados da sua conta não são afetados.')) return
              clearMigratedCopy()
              setMigratedCopy(false)
            }}
          >
            Apagar a cópia deste navegador
          </button>
        </section>
      )}

      <section className="card space-y-3">
        <h2 className="font-semibold">Backup dos dados</h2>
        <p className="muted">Seus dados ficam na nuvem. O backup JSON é uma cópia extra (sem as fotos). Importar adiciona ao que já existe, sem apagar nada. Itens de backups sem carro entram em &quot;{activeCarName}&quot;.</p>
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
            onSuccess={({ othersSignedOut }) => {
              setChangingPassword(false)
              setMessage(
                othersSignedOut
                  ? 'Senha alterada com sucesso. Os outros aparelhos foram desconectados.'
                  : 'Senha alterada, mas não foi possível desconectar os outros aparelhos. Se desconfia de algum acesso, tente de novo: Alterar senha.',
                !othersSignedOut,
              )
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
