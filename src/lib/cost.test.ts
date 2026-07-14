import { describe, expect, test } from 'vitest'
import { custoHora, custoParticipante, custoReuniao } from './cost'

describe('custoHora', () => {
  test('divide salário com encargos pelas 220h mensais da CLT', () => {
    // 5000 × 1.7 = 8500; 8500 / 220 = 38.6363...
    expect(custoHora(5000, 1.7)).toBeCloseTo(38.6364, 4)
  })

  test('usa fator de encargos 1.7 por padrão', () => {
    expect(custoHora(5000)).toBeCloseTo(custoHora(5000, 1.7), 10)
  })

  test('fator 1.0 significa salário puro', () => {
    expect(custoHora(2200, 1.0)).toBeCloseTo(10, 10)
  })
})

describe('custoParticipante', () => {
  test('proporcional ao tempo em segundos', () => {
    // R$60/h por 30 minutos = R$30
    expect(custoParticipante(60, 1800)).toBeCloseTo(30, 10)
  })

  test('zero segundos custa zero', () => {
    expect(custoParticipante(60, 0)).toBe(0)
  })
})

describe('custoReuniao', () => {
  test('soma o custo de todos os participantes', () => {
    const participantes = [
      { custoHora: 60, segundos: 3600 }, // R$60
      { custoHora: 100, segundos: 1800 }, // R$50
      { custoHora: 40, segundos: 900 }, // R$10
    ]
    expect(custoReuniao(participantes)).toBeCloseTo(120, 10)
  })

  test('reunião sem participantes custa zero', () => {
    expect(custoReuniao([])).toBe(0)
  })
})
