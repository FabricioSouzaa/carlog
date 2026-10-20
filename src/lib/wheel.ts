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

/** Quanto de um trecho já passou: 0 até `from`, 1 a partir de `to`, e linear no meio. Serve para animar partes da cena. */
export function ramp(value: number, from: number, to: number): number {
  return to === from ? (value >= to ? 1 : 0) : clamp((value - from) / (to - from), 0, 1)
}

/**
 * Posição do seletor, em "itens" (0 a weights.length), para um progresso `p` da rolagem. Cada trecho entre dois itens
 * ocupa uma fatia da rolagem proporcional ao seu peso (trechos com mais coisa acontecendo ganham mais rolagem).
 * Em vez de seguir a rolagem em linha reta, cada item "para" um pouco (`dwell` = fração do trecho em que ele fica parado)
 * e a troca acontece no meio do caminho, com partida e chegada suaves: dá a sensação de carrossel.
 */
export function weightedPosition(p: number, weights: number[], dwell = 0.16): number {
  if (weights.length === 0) return 0
  const total = weights.reduce((a, b) => a + b, 0)
  const u = clamp(p, 0, 1) * total
  if (u >= total) return weights.length
  let start = 0
  for (let i = 0; i < weights.length; i++) {
    const end = start + weights[i]
    if (u < end) {
      const t = clamp((u - start) / weights[i], 0, 1)
      const e = clamp((t - dwell) / (1 - 2 * dwell), 0, 1)
      return i + e * e * e * (e * (e * 6 - 15) + 10) // smootherstep
    }
    start = end
  }
  return weights.length
}

/** Igual a `weightedPosition` com todos os trechos do mesmo tamanho (seletor da seção 2). */
export function wheelPosition(p: number, count: number, dwell = 0.16): number {
  return count <= 1 ? 0 : weightedPosition(p, Array<number>(count - 1).fill(1), dwell)
}

/** Índice do item em foco para uma posição do seletor (em itens), entre `count` itens. */
export function activeIndex(position: number, count: number): number {
  return count > 1 ? Math.round(clamp(position, 0, count - 1)) : 0
}

/**
 * Rolagem (px da página) em que o item `index` fica em foco, dada a posição absoluta da seção.
 * Com `weights`, o ponto do item é o fim dos trechos anteriores (mesma conta de `weightedPosition`).
 */
export function scrollTargetFor(index: number, count: number, sectionTop: number, sectionHeight: number, viewportHeight: number, weights?: number[]): number {
  const total = Math.max(0, sectionHeight - viewportHeight)
  const w = weights ?? Array<number>(Math.max(0, count - 1)).fill(1)
  const sum = w.reduce((a, b) => a + b, 0)
  if (sum === 0) return sectionTop
  const before = w.slice(0, clamp(Math.round(index), 0, w.length)).reduce((a, b) => a + b, 0)
  return sectionTop + (before / sum) * total
}
