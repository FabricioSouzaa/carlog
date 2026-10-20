// Gera o HTML da imagem de prévia do link (public/og-image.png, 1200x630).
// Requer Node 22.18+ (ele lê o gauge.ts direto, sem compilar). Uso, na raiz do projeto:
//   node design/build-og-image.mjs /tmp/og.html
//   chrome --headless=new --window-size=1200,630 --virtual-time-budget=3000 --screenshot=public/og-image.png file:///tmp/og.html
import { writeFileSync } from 'node:fs'
import { gauge } from '../src/lib/gauge.ts'

const font = new URL('../public/fonts/space-grotesk-700.woff2', import.meta.url).href
const g = gauge(false)
const svg = `<svg viewBox="0 0 512 512" width="560" height="560" style="position:absolute;right:-40px;top:20px;opacity:.9">
<g transform="translate(0 15)"><path fill="#334155" d="${g.track}"/><path fill="#60a5fa" d="${g.progress}"/>${g.caps.map((c) => `<circle cx="${c.cx}" cy="${c.cy}" r="${c.r}" fill="#60a5fa"/>`).join('')}<path fill="#fff" d="${g.needle}"/><circle cx="${g.hub.cx}" cy="${g.hub.cy}" r="${g.hub.r}" fill="#fff"/></g></svg>`
writeFileSync(process.argv[2], `<!doctype html><meta charset="utf-8"><style>
@font-face{font-family:SG;font-weight:700;src:url(${font}) format('woff2')}
html,body{margin:0}body{width:1200px;height:630px;position:relative;overflow:hidden;background:linear-gradient(180deg,#0f172a 0%,#1d4ed8 100%);color:#fff;font-family:Inter,system-ui,sans-serif}
.n{position:absolute;left:80px;top:150px;font:700 120px/1 SG;letter-spacing:-4px}
.t{position:absolute;left:84px;top:290px;font:500 36px/1.2 system-ui;color:#cbd5e1}
.s{position:absolute;left:84px;top:410px;width:560px;font:700 44px/1.15 SG;letter-spacing:-1px}
</style><body>${svg}<div class="n">Carlog</div><div class="t">o histórico do seu carro</div><div class="s">Cada real do seu carro, no lugar certo.</div></body>`)
