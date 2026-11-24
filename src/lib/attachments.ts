/** Compara as fotos de um gasto antes e depois de uma edição: `added` subiram agora, `removed` foram tiradas. */
export function diffAttachments(prev: string[] = [], next: string[] = []): { added: string[]; removed: string[] } {
  return {
    added: next.filter((id) => !prev.includes(id)),
    removed: prev.filter((id) => !next.includes(id)),
  }
}
