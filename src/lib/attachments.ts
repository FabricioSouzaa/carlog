/** Compara as fotos de um gasto antes e depois de uma edição: `added` subiram agora, `removed` foram tiradas (sem repetir ids). */
export function diffAttachments(prev: string[] = [], next: string[] = []): { added: string[]; removed: string[] } {
  const before = new Set(prev)
  const after = new Set(next)
  return {
    added: [...after].filter((id) => !before.has(id)),
    removed: [...before].filter((id) => !after.has(id)),
  }
}
