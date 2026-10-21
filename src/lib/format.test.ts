import { describe, expect, it } from 'vitest'
import { addDaysISO, addMonthsISO } from './format'

describe('addDaysISO', () => {
  it('soma e subtrai dias, inclusive virando mês e ano', () => {
    expect(addDaysISO('2026-10-20', 1)).toBe('2026-10-21')
    expect(addDaysISO('2026-10-20', -9)).toBe('2026-10-11')
    expect(addDaysISO('2026-01-02', -5)).toBe('2025-12-28')
    expect(addDaysISO('2026-12-30', 3)).toBe('2027-01-02')
  })
  it('respeita ano bissexto', () => {
    expect(addDaysISO('2028-02-28', 1)).toBe('2028-02-29')
    expect(addDaysISO('2027-02-28', 1)).toBe('2027-03-01')
  })
})

describe('addMonthsISO', () => {
  it('soma e subtrai meses, inclusive virando o ano', () => {
    expect(addMonthsISO('2026-10', -11)).toBe('2025-11')
    expect(addMonthsISO('2026-01', -1)).toBe('2025-12')
    expect(addMonthsISO('2026-11', 2)).toBe('2027-01')
  })
})
