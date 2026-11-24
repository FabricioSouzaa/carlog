import { isImageId } from '../lib/imageId'
import { supabase } from '../supabase'

// Fotos (notas fiscais etc.) no Supabase Storage, bucket privado "receipts",
// uma pasta por usuário: <user_id>/<image_id>.jpg

const BUCKET = 'receipts'
const cache = new Map<string, Blob>() // evita baixar de novo a cada renderização

// Ao sair da conta, as fotos baixadas somem da memória: quem entrar depois, na mesma aba, não herda imagens do anterior.
supabase.auth.onAuthStateChange((event) => {
  if (event === 'SIGNED_OUT') cache.clear()
})

async function pathFor(id: string): Promise<string> {
  if (!isImageId(id)) throw new Error('Identificador de foto inválido')
  const { data } = await supabase.auth.getSession()
  const uid = data.session?.user.id
  if (!uid) throw new Error('Sem sessão')
  return `${uid}/${id}.jpg`
}

export async function saveImage(id: string, blob: Blob): Promise<void> {
  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(await pathFor(id), blob, { contentType: 'image/jpeg', upsert: true })
  if (error) throw new Error(error.message)
  cache.set(id, blob)
}

export async function getImage(id: string): Promise<Blob | undefined> {
  const hit = cache.get(id)
  if (hit) return hit
  const { data, error } = await supabase.storage.from(BUCKET).download(await pathFor(id))
  if (error || !data) return undefined
  cache.set(id, data)
  return data
}

export async function deleteImage(id: string): Promise<void> {
  cache.delete(id)
  const { error } = await supabase.storage.from(BUCKET).remove([await pathFor(id)])
  if (error) throw new Error(error.message)
}
