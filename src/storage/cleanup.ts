/**
 * Roda `cleanup` (ex.: apagar fotos) só depois de `op` (a gravação no banco) dar certo.
 * Se `op` falhar, o erro segue adiante e nada é apagado: o registro continua apontando para fotos que existem.
 * Falhas do `cleanup` não viram erro do usuário (no máximo sobra uma foto órfã no Storage).
 */
export async function thenCleanup(op: Promise<unknown>, cleanup: () => Promise<unknown>): Promise<void> {
  await op
  await cleanup().catch(() => {})
}
