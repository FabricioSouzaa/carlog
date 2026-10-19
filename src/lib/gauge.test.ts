import { describe, expect, it } from 'vitest'
import { gauge, polar, sector } from './gauge'

describe('polar', () => {
  it('0° fica à direita e 90° em cima (y do SVG cresce para baixo)', () => {
    expect(polar(100, 100, 10, 0)).toEqual([110, 100])
    expect(polar(100, 100, 10, 90)).toEqual([100, 90])
  })
})

describe('sector', () => {
  it('usa arco grande só acima de 180°', () => {
    expect(sector(0, 0, 10, 5, 210, -30)).toContain(' 0 1 1 ')
    expect(sector(0, 0, 10, 5, 210, 40)).toContain(' 0 0 1 ')
  })
})

describe('gauge', () => {
  it('a versão grossa tem anel mais largo e miolo maior que a fina', () => {
    const thin = gauge(false)
    const heavy = gauge(true)
    expect(heavy.hub.r).toBeGreaterThan(thin.hub.r)
    expect(heavy.caps[0].r).toBeGreaterThan(thin.caps[0].r)
    expect(heavy.track).not.toBe(thin.track)
  })
})
