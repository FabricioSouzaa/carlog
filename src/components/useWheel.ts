import { useCallback, useEffect, useRef } from 'react'
import { flushSync } from 'react-dom'
import { scrollTargetFor, weightedPosition, wheelProgress } from '../lib/wheel'

/**
 * Liga uma seção alta (com palco "sticky" dentro) à rolagem. A cada frame chama `onPosition` com a posição da cena, em itens (0 a
 * `weights.length`), e devolve `goTo` para rolar até um item. Cada item "para" um instante (`weightedPosition`) e o movimento
 * desliza atrás da rolagem (amortecimento por `tau`). Não escreve nada no DOM da seção: quem usa decide o que mudar a cada frame.
 */
export function useWheel({
    tau = 70,
    dwell,
    weights,
    staticPosition = 0,
    onPosition,
  }: {
    /** Quanto o desenho demora para alcançar a rolagem (constante de tempo, ms): menor = mais colado ao dedo. */
    tau?: number
    /** Fração do trecho em que cada item fica parado (ver `weightedPosition`). */
    dwell?: number
    /** Peso de cada trecho entre itens (trechos mais pesados ganham mais rolagem). Use uma constante: muda o efeito se trocar a cada render. */
    weights: number[]
    /** Posição usada quando a seção é só um bloco comum (movimento reduzido ou sem suporte). */
    staticPosition?: number
    /** Chamado a cada frame com a posição desenhada (em itens), para cenas que dependem dela. */
    onPosition?: (position: number) => void
  }) {
  const ref = useRef<HTMLElement>(null)
  const onPositionRef = useRef(onPosition)
  useEffect(() => {
    onPositionRef.current = onPosition
  })

  useEffect(() => {
    const el = ref.current
    if (!el) return
    let target = 0 // posição pedida pela rolagem (em itens)
    let current = 0 // posição desenhada: vai atrás da pedida, para o movimento deslizar
    let raf = 0
    // a cada quadro a cena é atualizada e confirmada NO MESMO quadro (`flushSync`): sem isso o React agenda a renderização para depois do
    // desenho e a cena chega um quadro atrasada em relação à rolagem, de forma irregular quando a página está ocupada
    const draw = (sync: boolean) => {
      const fn = onPositionRef.current
      if (!fn) return
      if (sync) flushSync(() => fn(current))
      else fn(current)
    }
    let lastFrame = 0 // instante do frame anterior, para o amortecimento depender do tempo e não da taxa de quadros
    const frame = (now: number) => {
      raf = 0
      const dt = lastFrame ? Math.min(now - lastFrame, 64) : 16
      lastFrame = now
      current += (target - current) * (1 - Math.exp(-dt / tau))
      if (Math.abs(target - current) < 0.002) current = target // ~2 px de rolagem: além disso o fim da curva só gastaria quadros sem se ver
      draw(true)
      if (current !== target) raf = requestAnimationFrame(frame)
      else lastFrame = 0
    }
    // a "janela" é a altura do palco fixo (100 * --sh), não window.innerHeight: nos celulares os dois mudam em
    // momentos diferentes quando a barra de endereço some, e a conta desencontrava nas pontas
    const stage = el.firstElementChild as HTMLElement | null
    // sem o palco fixo (movimento reduzido ou sem suporte) a seção é um bloco comum e não há o que acompanhar
    // o que só muda ao redimensionar (se o palco é fixo e as alturas) fica guardado: ler `getComputedStyle` e `offsetHeight` a cada evento de
    // rolagem obrigava o navegador a recalcular estilo e layout várias vezes por quadro
    let isPinned = false
    let sectionH = 0
    let stageH = 0
    const measure = () => {
      isPinned = !!stage && getComputedStyle(stage).position === 'sticky'
      sectionH = el.offsetHeight
      stageH = stage ? stage.offsetHeight : 0
    }
    const read = () => {
      if (!isPinned) return staticPosition
      const p = wheelProgress(el.getBoundingClientRect().top, sectionH, stageH)
      return weightedPosition(p, weights, dwell)
    }
    // só acompanha a rolagem enquanto a seção está a até uma tela de distância: longe dela não há nada a desenhar e cada leitura de layout custa
    let near = typeof IntersectionObserver === 'undefined'
    const onScroll = () => {
      if (!near) return
      target = read()
      if (!raf) raf = requestAnimationFrame(frame)
    }
    // mede de novo e vai para a posição certa (animando)
    const refresh = () => {
      measure()
      target = read()
      if (!raf) raf = requestAnimationFrame(frame)
    }
    measure()
    target = current = read() // ao carregar, já na posição certa (sem deslizar)
    draw(false)
    // `--sh` (de onde vêm as alturas) é atualizado um quadro DEPOIS do evento `resize`, e fontes e quebras de linha também mudam as alturas sem
    // `resize`: quem avisa é um ResizeObserver na seção e no palco (sem ele, as medidas guardadas ficariam velhas)
    const ro = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(refresh)
    ro?.observe(el)
    if (stage) ro?.observe(stage)
    const io =
      typeof IntersectionObserver === 'undefined'
        ? null
        : new IntersectionObserver(
            (entries) => {
              // se vierem vários avisos juntos (rolagem rápida, página ocupada), vale o mais recente
              near = entries[entries.length - 1].isIntersecting
              if (near) {
                refresh() // acabou de chegar perto: a página pode ter mudado de altura desde a última medida
              } else {
                // saiu de perto: a cena assenta no estado certo (começo ou fim) de uma vez, fora da vista, e não no meio do caminho onde o
                // último evento de rolagem a deixou numa passada rápida
                measure()
                target = current = read()
                if (raf) cancelAnimationFrame(raf)
                raf = 0
                lastFrame = 0
                draw(false)
              }
            },
            { rootMargin: '100% 0px 100% 0px' },
          )
    io?.observe(el)
    window.addEventListener('scroll', onScroll, { passive: true })
    if (!ro) window.addEventListener('resize', refresh)
    return () => {
      io?.disconnect()
      ro?.disconnect()
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', refresh)
      if (raf) cancelAnimationFrame(raf)
    }
  }, [tau, dwell, weights, staticPosition])

  /** Rola a página até o ponto em que o item `index` fica em foco. */
  const goTo = useCallback(
    (index: number) => {
      const el = ref.current
      const stage = el?.firstElementChild as HTMLElement | null
      if (!el || !stage) return
      const top = scrollTargetFor(index, weights.length, el.getBoundingClientRect().top + window.scrollY, el.offsetHeight, stage.offsetHeight, weights)
      window.scrollTo({ top, behavior: 'smooth' })
    },
    [weights],
  )

  return { ref, goTo }
}
