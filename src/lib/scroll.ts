/**
 * Onde a pessoa está no "mapa" da landing, em seções: 0 = no começo da primeira, 1 = a segunda acabou de chegar ao topo,
 * 2,5 = no meio entre a terceira e a quarta, e assim por diante (o último valor é a última seção). Contínuo, para o marcador deslizar.
 * `tops` são as posições (px, na página) do topo de cada seção, em ordem; vale a seção cujo topo já passou do topo da janela.
 * No fim da página vale o último ponto; se a última seção é curta demais para o seu topo chegar lá em cima, o marcador chega
 * nele deslizando até o fim da rolagem.
 */
export function railPosition(tops: number[], scrollY: number, viewportHeight: number, documentHeight: number): number {
  const last = tops.length - 1
  if (last < 1) return 0
  const maxScroll = documentHeight - viewportHeight
  if (scrollY >= maxScroll - 2) return last
  // se a última seção é curta, o topo dela nunca chega ao topo da janela: o último ponto passa a ser o fim da rolagem,
  // para o marcador chegar lá deslizando (e não pulando nos últimos pixels)
  const points = tops.slice()
  points[last] = Math.max(Math.min(tops[last], maxScroll), tops[last - 1] + 1)
  let i = 0
  for (let k = 0; k <= last; k++) if (points[k] <= scrollY) i = k
  if (i >= last) return last
  const span = points[i + 1] - points[i]
  return span > 0 ? i + Math.min(1, Math.max(0, (scrollY - points[i]) / span)) : i
}
