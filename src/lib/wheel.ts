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

/**
 * Posição do seletor, em "itens" (0 a count-1), para um progresso `p` da rolagem.
 * Em vez de seguir a rolagem em linha reta, cada card "para" um pouco no centro (`dwell` = fração do trecho
 * em que ele fica parado) e a troca acontece no meio do caminho, com partida e chegada suaves: dá a sensação de carrossel.
 */
export function wheelPosition(p: number, count: number, dwell = 0.22): number {
  if (count <= 1) return 0
  const u = clamp(p, 0, 1) * (count - 1)
  if (u >= count - 1) return count - 1
  const i = Math.floor(u)
  const t = clamp((u - i - dwell) / (1 - 2 * dwell), 0, 1)
  return i + t * t * t * (t * (t * 6 - 15) + 10) // smootherstep
}

/** Índice do item em foco para uma posição do seletor (em itens), entre `count` itens. */
export function activeIndex(position: number, count: number): number {
  return count > 1 ? Math.round(clamp(position, 0, count - 1)) : 0
}

/** Rolagem (px da página) em que o item `index` fica em foco, dada a posição absoluta da seção. */
export function scrollTargetFor(index: number, count: number, sectionTop: number, sectionHeight: number, viewportHeight: number): number {
  const total = Math.max(0, sectionHeight - viewportHeight)
  return sectionTop + (count > 1 ? (clamp(index, 0, count - 1) / (count - 1)) * total : 0)
}
