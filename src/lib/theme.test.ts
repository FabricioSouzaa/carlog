import { afterEach, describe, expect, it } from 'vitest'
import { isThemeChoice, readThemeChoice, resolveTheme, saveThemeChoice } from './theme'

describe('resolveTheme', () => {
  it('"sistema" segue o aparelho', () => {
    expect(resolveTheme('system', true)).toBe('dark')
    expect(resolveTheme('system', false)).toBe('light')
  })
  it('escolha explícita vale mesmo contra o aparelho', () => {
    expect(resolveTheme('light', true)).toBe('light')
    expect(resolveTheme('dark', false)).toBe('dark')
  })
})

describe('isThemeChoice', () => {
  it('só aceita os três valores', () => {
    expect(['system', 'light', 'dark'].every(isThemeChoice)).toBe(true)
    expect(isThemeChoice('azul')).toBe(false)
    expect(isThemeChoice(null)).toBe(false)
  })
})

describe('escolha guardada', () => {
  const store = new Map<string, string>()
  const fake = { getItem: (k: string) => store.get(k) ?? null, setItem: (k: string, v: string) => void store.set(k, v) }
  afterEach(() => {
    store.clear()
    // @ts-expect-error volta ao ambiente de teste
    delete globalThis.localStorage
  })
  it('sem nada guardado é "sistema"', () => {
    Object.defineProperty(globalThis, 'localStorage', { value: fake, configurable: true })
    expect(readThemeChoice()).toBe('system')
  })
  it('lê o que foi salvo e ignora lixo', () => {
    Object.defineProperty(globalThis, 'localStorage', { value: fake, configurable: true })
    saveThemeChoice('dark')
    expect(readThemeChoice()).toBe('dark')
    store.set('carlog:theme', 'roxo')
    expect(readThemeChoice()).toBe('system')
  })
  it('armazenamento que falha não derruba: volta a "sistema"', () => {
    Object.defineProperty(globalThis, 'localStorage', {
      value: { getItem: () => { throw new Error('bloqueado') }, setItem: () => { throw new Error('bloqueado') } },
      configurable: true,
    })
    expect(readThemeChoice()).toBe('system')
    expect(() => saveThemeChoice('light')).not.toThrow()
  })
})
