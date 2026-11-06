/**
 * Onde a pessoa está no "mapa" da landing, em seções: 0 = no começo da primeira, 1 = a segunda acabou de chegar ao topo,
 * 2,5 = no meio entre a terceira e a quarta, e assim por diante (o último valor é a última seção). Contínuo, para o marcador deslizar.
 * `tops` são as posições (px, na página) do topo de cada seção, em ordem; vale a seção cujo topo já passou do topo da janela.
 * No fim da página vale o último ponto, mesmo que a última seção seja curta demais para o seu topo chegar lá em cima.
 */
export function railPosition(tops: number[], scrollY: number, viewportHeight: number, documentHeight: number): number {
  const last = tops.length - 1
  if (last < 1) return 0
  if (scrollY + viewportHeight >= documentHeight - 2) return last
  let i = 0
  for (let k = 0; k <= last; k++) if (tops[k] <= scrollY) i = k
  if (i >= last) return last
  const span = tops[i + 1] - tops[i]
  return span > 0 ? i + Math.min(1, Math.max(0, (scrollY - tops[i]) / span)) : i
}
