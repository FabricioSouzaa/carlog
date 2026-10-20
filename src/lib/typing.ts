/** Pausa extra (ms) depois de pontuação, para soar como alguém digitando. */
const PAUSE: Record<string, number> = { ',': 220, '.': 320 }

/** Tempo (ms) até digitar a próxima letra, depois de `char`. */
export const delayAfter = (char: string, speed: number): number => speed + (PAUSE[char] ?? 0)

/** Quanto tempo (ms) o texto leva para ser digitado, incluindo a espera inicial. Serve para agendar o que vem depois. */
export function typingDuration(text: string, speed = 48, startDelay = 500): number {
  return startDelay + [...text].reduce((sum, c) => sum + delayAfter(c, speed), 0)
}
