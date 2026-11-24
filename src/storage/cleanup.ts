/**
 * Roda `cleanup` (ex.: apagar fotos) só depois de `op` (a gravação no banco) dar certo.
 * Se `op` falhar, o erro segue adiante e nada é apagado: o registro continua apontando para fotos que existem.
 * Falhas do `cleanup` não viram erro do usuário (no máximo sobra uma foto órfã no Storage).
 */
export async function thenCleanup(op: Promise<unknown>, cleanup: () => Promise<unknown>): Promise<void> {
  await op
  await cleanup().catch(() => {})
}

/** O servidor respondeu e recusou (erro com `code`)? Falha de rede, timeout ou queda não têm `code`: aí não dá para saber se gravou. */
export function isDefinitiveFailure(e: unknown): boolean {
  const code = (e as { code?: unknown } | null)?.code
  return typeof code === 'string' && code !== ''
}

/**
 * O contrário de `thenCleanup`: roda `cleanup` (ex.: apagar fotos recém-enviadas) se `op` for RECUSADA pelo servidor, e repassa o erro.
 * As fotos sobem antes do registro no banco; se ele recusar, elas ficariam no Storage sem nenhum gasto apontando para elas.
 * Se o erro for ambíguo (rede caiu: o registro pode ter sido gravado e só a resposta se perdeu), NÃO apaga: uma foto órfã
 * custa pouco, perder a nota fiscal de um gasto que existe custa muito.
 */
export async function cleanupOnError(op: Promise<unknown>, cleanup: () => Promise<unknown>): Promise<void> {
  try {
    await op
  } catch (e) {
    if (isDefinitiveFailure(e)) await cleanup().catch(() => {})
    throw e
  }
}
