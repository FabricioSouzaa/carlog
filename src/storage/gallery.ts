import { supabase } from '../supabase'

// Galeria de fotos do carro: mesmo bucket privado das notas fiscais, em <user_id>/gallery/.
// As regras de acesso do bucket já valem para qualquer subpasta do usuário (ver supabase/schema.sql).

const BUCKET = 'receipts'
export const MAX_GALLERY_PHOTOS = 60
// O limite de 60 é do app (o uso é individual e o cadastro é fechado; o Storage não conta arquivos por pasta). A listagem
// pede muito mais que isso (1000 é o máximo do Storage) para que, se passar de 60 por outra via, nenhuma foto fique escondida.
const LIST_LIMIT = 1000

export interface GalleryPhoto {
  name: string // nome do arquivo dentro da pasta da galeria
  url: string // endereço temporário (1 hora) para exibir a foto
}

async function folder(): Promise<string> {
  const { data } = await supabase.auth.getSession()
  const uid = data.session?.user.id
  if (!uid) throw new Error('Sem sessão')
  return `${uid}/gallery`
}

export async function listGallery(): Promise<GalleryPhoto[]> {
  const dir = await folder()
  const { data, error } = await supabase.storage
    .from(BUCKET)
    .list(dir, { limit: LIST_LIMIT, sortBy: { column: 'created_at', order: 'asc' } })
  if (error) throw new Error(error.message)
  const files = (data ?? []).filter((f) => f.id && !f.name.startsWith('.'))
  if (files.length === 0) return []
  const signed = await supabase.storage.from(BUCKET).createSignedUrls(
    files.map((f) => `${dir}/${f.name}`),
    3600,
  )
  if (signed.error) throw new Error(signed.error.message)
  return files.flatMap((f, i) => {
    const url = signed.data[i]?.signedUrl
    return url ? [{ name: f.name, url }] : []
  })
}

export async function addGalleryPhoto(id: string, blob: Blob): Promise<void> {
  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(`${await folder()}/${id}.jpg`, blob, { contentType: 'image/jpeg' })
  if (error) throw new Error(error.message)
}

export async function deleteGalleryPhoto(name: string): Promise<void> {
  const { error } = await supabase.storage.from(BUCKET).remove([`${await folder()}/${name}`])
  if (error) throw new Error(error.message)
}
