/** Quanto da página já foi rolado, de 0 (topo) a 1 (fim). Página que cabe na tela não tem o que rolar: 0. */
export function scrollProgress(scrollY: number, scrollHeight: number, viewportHeight: number): number {
  const max = scrollHeight - viewportHeight
  if (!(max > 0)) return 0
  return Math.min(1, Math.max(0, scrollY / max))
}
