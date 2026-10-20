const clamp = (n: number, min: number, max: number) => Math.min(max, Math.max(min, n))

/**
 * Progresso (0 a 1) de uma seção alta com conteúdo fixo ("sticky") dentro dela.
 * `top` é a distância do topo da seção ao topo da janela (negativa depois que ela sobe).
 * A seção "gasta" `sectionHeight - viewportHeight` pixels de rolagem com o conteúdo fixo na tela.
 */
export function wheelProgress(top: number, sectionHeight: number, viewportHeight: number): number {
  const total = sectionHeight - viewportHeight
  return total > 0 ? clamp(-top / total, 0, 1) : 0
}

/** Índice do item em foco para um progresso `p`, entre `count` itens. */
export function activeIndex(p: number, count: number): number {
  return count > 1 ? Math.round(clamp(p, 0, 1) * (count - 1)) : 0
}

/** Rolagem (px da página) em que o item `index` fica em foco, dada a posição absoluta da seção. */
export function scrollTargetFor(index: number, count: number, sectionTop: number, sectionHeight: number, viewportHeight: number): number {
  const total = Math.max(0, sectionHeight - viewportHeight)
  return sectionTop + (count > 1 ? (clamp(index, 0, count - 1) / (count - 1)) * total : 0)
}
