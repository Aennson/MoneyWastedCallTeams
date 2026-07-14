import { describe, expect, test } from 'vitest'
import { fmtBRL, fmtDuracao } from './format'

describe('fmtBRL', () => {
  test('formata em reais com centavos', () => {
    // Intl usa espaço não separável após R$
    expect(fmtBRL(1234.5).replace(/ /g, ' ')).toBe('R$ 1.234,50')
  })
  test('zero', () => {
    expect(fmtBRL(0).replace(/ /g, ' ')).toBe('R$ 0,00')
  })
})

describe('fmtDuracao', () => {
  test('horas, minutos e segundos', () => {
    expect(fmtDuracao(3730)).toBe('1h 02m 10s')
  })
  test('menos de uma hora omite horas', () => {
    expect(fmtDuracao(2700)).toBe('45m 00s')
  })
  test('menos de um minuto', () => {
    expect(fmtDuracao(30)).toBe('30s')
  })
  test('zero', () => {
    expect(fmtDuracao(0)).toBe('0s')
  })
})
