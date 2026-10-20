// Gera design/icon-source.svg (tela cheia, também usado como maskable) e public/favicon.svg
// a partir da mesma geometria do logo (src/lib/gauge.ts). Requer Node 22.18+ (lê o .ts direto). Rode na raiz do projeto:
//   node design/build-icons.mjs
// Depois renderize os PNGs a partir de icon-source.svg (Chrome sem interface + sips):
//   - 512 px: abra o SVG inline numa página de 512x512 e use `chrome --headless=new --window-size=512,512 --screenshot=...`
//   - reduza com `sips -z 192 192` e `sips -z 180 180` para icon-192.png e apple-touch-icon.png
import { writeFileSync } from 'node:fs'
import { gauge } from '../src/lib/gauge.ts'

const g = gauge(true)
const glyph = (transform) =>
  `<g transform="${transform}"><path fill="#1e293b" d="${g.track}"/><path fill="#3b82f6" d="${g.progress}"/>` +
  g.caps.map((c) => `<circle cx="${c.cx}" cy="${c.cy}" r="${c.r}" fill="#3b82f6"/>`).join('') +
  `<path fill="#e2e8f0" d="${g.needle}"/><circle cx="${g.hub.cx}" cy="${g.hub.cy}" r="${g.hub.r}" fill="#e2e8f0"/></g>`

// o desenho ocupa y de 86 a ~396 (centro ~241): desce 15 para ficar no meio do quadrado de 512
const CENTER = 'translate(0 15)'
// tela cheia: 85% e centralizado, com folga para o recorte maskable (círculo central de 80%)
const SAFE = 'translate(256 256) scale(0.85) translate(-256 -241)'

const full = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
  <!-- Gerado por design/build-icons.mjs a partir de src/lib/gauge.ts. Tela cheia: serve também como maskable. -->
  <rect width="512" height="512" fill="#0f172a"/>
  ${glyph(SAFE)}
</svg>
`
const favicon = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
  <rect width="512" height="512" rx="112" fill="#0f172a"/>
  ${glyph(CENTER)}
</svg>
`
const root = new URL('../', import.meta.url)
writeFileSync(new URL('design/icon-source.svg', root), full)
writeFileSync(new URL('public/favicon.svg', root), favicon)
