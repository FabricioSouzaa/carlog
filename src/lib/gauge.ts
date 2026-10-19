/** Geometria do logo (velocímetro): arcos e ponteiro calculados em vez de colados como caminhos prontos. */
export type Point = [number, number]

const round = (n: number) => Math.round(n * 10) / 10

/** Ponto no círculo. `deg` em graus com o 0 à direita e y para cima (como no desenho); o SVG tem y para baixo. */
export function polar(cx: number, cy: number, r: number, deg: number): Point {
  const rad = (deg * Math.PI) / 180
  return [round(cx + r * Math.cos(rad)), round(cy - r * Math.sin(rad))]
}

/** Setor anular no sentido horário, de `from` até `to` (`from` > `to`). */
export function sector(cx: number, cy: number, outer: number, inner: number, from: number, to: number): string {
  const large = from - to > 180 ? 1 : 0
  const [x0, y0] = polar(cx, cy, outer, from)
  const [x1, y1] = polar(cx, cy, outer, to)
  const [x2, y2] = polar(cx, cy, inner, to)
  const [x3, y3] = polar(cx, cy, inner, from)
  return `M${x0} ${y0} A${outer} ${outer} 0 ${large} 1 ${x1} ${y1} L${x2} ${y2} A${inner} ${inner} 0 ${large} 0 ${x3} ${y3} Z`
}

/** Ponteiro: triângulo fino saindo do centro. */
export function needle(cx: number, cy: number, deg: number, length: number, halfWidth: number): string {
  const rad = (deg * Math.PI) / 180
  const px = Math.sin(rad) * halfWidth
  const py = Math.cos(rad) * halfWidth
  const [tx, ty] = polar(cx, cy, length, deg)
  return `M${round(cx + px)} ${round(cy + py)} L${tx} ${ty} L${round(cx - px)} ${round(cy - py)} Z`
}

const CX = 256
const CY = 282
const START = 210
const END = -30
const VALUE = 40

/** `heavy`: traço mais grosso, para tamanhos pequenos (a linha fina some abaixo de uns 40 px). */
export function gauge(heavy: boolean) {
  const outer = heavy ? 196 : 184
  const inner = heavy ? 164 : 168
  const mid = (outer + inner) / 2
  const capR = heavy ? 16 : 8
  const [sx, sy] = polar(CX, CY, mid, START)
  const [vx, vy] = polar(CX, CY, mid, VALUE)
  return {
    track: sector(CX, CY, outer, inner, START, END),
    progress: sector(CX, CY, outer, inner, START, VALUE),
    caps: [
      { cx: sx, cy: sy, r: capR },
      { cx: vx, cy: vy, r: capR },
    ],
    needle: needle(CX, CY, VALUE, 150, heavy ? 12 : 7),
    hub: { cx: CX, cy: CY, r: heavy ? 30 : 20 },
  }
}
