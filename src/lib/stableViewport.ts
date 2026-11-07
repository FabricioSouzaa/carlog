export interface Viewport {
  width: number
  height: number
}

/** Quanto a altura da janela pode mudar de uma vez sem ser a barra de endereço do navegador do celular (px). */
const TOOLBAR_MAX_JUMP = 160

/**
 * Altura de janela "estável" para medir as seções da landing. Nos celulares a barra de endereço encolhe no primeiro gesto de
 * rolagem e a altura da janela cresce ~40 a 100 px; tudo que é medido em % ou em `dvh` muda junto (a página inteira mexe e o trilho
 * escorrega). `svh` resolve no Safari, mas outros navegadores do iPhone (o Chrome) não informam a diferença e o `svh` se comporta
 * como `dvh`. Então a altura é guardada: num celular (ponteiro "grosso"), pequenas mudanças só podem DIMINUIR a altura guardada
 * (a menor altura vista é a da barra aberta, que é a certa); mudar a largura (girar a tela) ou saltar mais de 160 px (teclado)
 * conta como outra tela e recomeça. No computador acompanha a janela inteira, como sempre.
 * Limite conhecido: num celular/tablet cuja janela CRESCE menos de 160 px sem mudar a largura por outro motivo (Stage Manager do iPad,
 * dobrável, PWA indo para tela cheia), isso é indistinguível da barra de endereço encolhendo e a altura guardada não acompanha até girar a tela.
 */
export function nextStableViewport(prev: Viewport | null, now: Viewport, coarsePointer: boolean): Viewport {
  if (!prev || !coarsePointer) return now
  if (now.width !== prev.width || Math.abs(now.height - prev.height) > TOOLBAR_MAX_JUMP) return now
  return { width: prev.width, height: Math.min(prev.height, now.height) }
}

/** Liga a altura estável à variável CSS `--sh` (1% dela): `calc(100 * var(--sh, 1svh))` é a altura da tela. Sem JavaScript, vale `1svh`. */
export function installStableViewport(): void {
  if (typeof window === 'undefined') return
  const coarse = window.matchMedia?.('(pointer: coarse)')
  let state: Viewport | null = null
  let frame = 0
  const apply = () => {
    frame = 0
    const next = nextStableViewport(state, { width: window.innerWidth, height: window.innerHeight }, !!coarse?.matches)
    // escrever na raiz revisa o estilo do documento inteiro: só quando a altura de fato mudou
    if (!state || next.height !== state.height) document.documentElement.style.setProperty('--sh', `${next.height / 100}px`)
    state = next
  }
  apply()
  // arrastar a borda da janela (ou a barra do celular animando) dispara muitos `resize`: no máximo um por quadro
  window.addEventListener('resize', () => {
    if (!frame) frame = requestAnimationFrame(apply)
  })
}
