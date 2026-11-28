import type { BackupData } from '../types'

// Dados da versão anterior (só neste navegador): localStorage + IndexedDB.
// Lidos apenas para migrar para a conta; nada é apagado — o localStorage é renomeado como cópia.

const KEY = 'historico-carro:v1'
const BACKUP_KEY = 'historico-carro:v1:migrado'
const DB_NAME = 'historico-carro-images'
const STORE = 'images'

export function loadLegacyData(): BackupData | null {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return null
    const v = JSON.parse(raw) as BackupData
    if (!Array.isArray(v.categories) || !Array.isArray(v.expenses) || !Array.isArray(v.planned)) return null
    return v.expenses.length + v.planned.length > 0 ? v : null
  } catch {
    return null
  }
}

/** Guarda uma cópia sob outro nome e libera a chave original para não migrar duas vezes. */
export function markLegacyMigrated(): void {
  try {
    const raw = localStorage.getItem(KEY)
    if (raw) localStorage.setItem(BACKUP_KEY, raw)
    localStorage.removeItem(KEY)
  } catch {
    // ignora
  }
}

export function getLegacyImage(id: string): Promise<Blob | undefined> {
  return new Promise((resolve) => {
    if (typeof indexedDB === 'undefined') return resolve(undefined)
    const open = indexedDB.open(DB_NAME)
    open.onerror = () => resolve(undefined)
    open.onsuccess = () => {
      const db = open.result
      if (!db.objectStoreNames.contains(STORE)) return resolve(undefined)
      const req = db.transaction(STORE, 'readonly').objectStore(STORE).get(id)
      req.onsuccess = () => resolve(req.result as Blob | undefined)
      req.onerror = () => resolve(undefined)
    }
  })
}

/** Existe a cópia que sobrou depois de migrar (ainda com os dados antigos, em texto, neste navegador)? */
export function hasMigratedCopy(): boolean {
  try {
    return localStorage.getItem(BACKUP_KEY) !== null
  } catch {
    return false
  }
}

/** Apaga a cópia `:migrado` deste navegador. Só o usuário aciona: os dados já estão na conta. */
export function clearMigratedCopy(): void {
  try {
    localStorage.removeItem(BACKUP_KEY)
  } catch {
    // ignora
  }
}
