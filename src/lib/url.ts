/** Devolve o endereço normalizado se `text` for um link http(s) válido (e só isso, sem espaços); senão null. */
export function safeHttpUrl(text: string): string | null {
  if (!/^https?:\/\/\S+$/.test(text)) return null
  try {
    const url = new URL(text)
    return url.protocol === 'http:' || url.protocol === 'https:' ? url.href : null
  } catch {
    return null
  }
}
