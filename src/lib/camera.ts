const clamp = (n: number, min: number, max: number) => Math.min(max, Math.max(min, n))
const smooth = (t: number) => t * t * (3 - 2 * t)
const lerp = (a: number, b: number, t: number) => a + (b - a) * t

/** Posição e zoom da "câmera" sobre o quadro: `scale` e o deslocamento (px) a aplicar com origem no canto de cima à esquerda. */
export interface Shot {
  scale: number
  x: number
  y: number
}

export interface Rect {
  x: number
  y: number
  w: number
  h: number
}

/** Quadro inteiro, centralizado na janela de visualização. */
export function overview(board: { w: number; h: number }, view: { w: number; h: number }): Shot {
  const scale = Math.min(view.w / board.w, view.h / board.h)
  return { scale, x: (view.w - board.w * scale) / 2, y: (view.h - board.h * scale) / 2 }
}

/** Aproxima de `target`: cabe na janela com folga (`fill`), sem passar de `maxScale` nem ficar menor que `minScale`. */
export function zoomTo(target: Rect, view: { w: number; h: number }, minScale: number, maxScale = 2.2, fill = 0.9): Shot {
  const scale = clamp(Math.min((view.w * fill) / target.w, (view.h * fill) / target.h), minScale, maxScale)
  return { scale, x: view.w / 2 - (target.x + target.w / 2) * scale, y: view.h / 2 - (target.y + target.h / 2) * scale }
}

/** Menor retângulo que contém todos. */
export function union(rects: Rect[]): Rect {
  const x0 = Math.min(...rects.map((r) => r.x))
  const y0 = Math.min(...rects.map((r) => r.y))
  const x1 = Math.max(...rects.map((r) => r.x + r.w))
  const y1 = Math.max(...rects.map((r) => r.y + r.h))
  return { x: x0, y: y0, w: x1 - x0, h: y1 - y0 }
}

/**
 * A câmera em `position` (0 = quadro inteiro, 1 a N = cada parte). Entre dois planos ela se move só no começo do trecho
 * (`move` = fração do trecho gasta andando) e fica parada no resto, para a parte "carregar" com a câmera já em cima.
 * `focus[k]` (k de 1 a N) vale 1 quando a câmera está em cima da parte k; `zoom` vai de 0 (quadro inteiro) a 1.
 */
export function cameraAt(position: number, shots: Shot[], move = 0.45): { shot: Shot; focus: number[]; zoom: number } {
  const last = shots.length - 1
  const p = clamp(position, 0, last)
  const i = Math.min(last - 1, Math.floor(p))
  const t = smooth(clamp((p - i) / move, 0, 1))
  const focus = shots.map((_, k) => (k === i ? 1 - t : 0) + (k === i + 1 ? t : 0))
  return {
    shot: { scale: lerp(shots[i].scale, shots[i + 1].scale, t), x: lerp(shots[i].x, shots[i + 1].x, t), y: lerp(shots[i].y, shots[i + 1].y, t) },
    focus: focus.slice(1),
    zoom: i === 0 ? t : 1,
  }
}
