/** Ids de foto são UUIDs gerados pelo app. Conferir antes de montar o caminho no Storage evita `../` e afins vindos de dados de fora. */
const IMAGE_ID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export function isImageId(id: string): boolean {
  return IMAGE_ID.test(id)
}
