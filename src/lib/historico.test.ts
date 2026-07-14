import { describe, expect, test } from 'vitest'
import { montarResumo } from './historico'
import type { Relatorio } from './relatorio'

const relatorio: Relatorio = {
  linhas: [
    {
      nome: 'Ana Silva',
      segundos: 3715,
      cargoTitulo: 'Programador de sistemas de informação',
      salario: 5500,
      fonte: 'dataset-nacional',
      custoHora: 25,
      custo: 25.7986,
    },
    {
      nome: 'Bruno Costa',
      segundos: 3300,
      cargoTitulo: undefined,
      salario: null,
      fonte: 'nao-encontrado',
      custoHora: 0,
      custo: 0,
    },
  ],
  total: 25.7986,
  naoResolvidos: 1,
}

describe('montarResumo', () => {
  const resumo = montarResumo({
    id: 'abc-123',
    relatorio,
    titulo: 'Daily do time',
    origem: 'pos-reuniao',
    fatorEncargos: 1.0,
    duracaoReuniaoSegundos: 3730,
    agora: new Date('2026-07-14T15:30:00.000Z'),
  })

  test('carrega identificação, origem e data ISO', () => {
    expect(resumo.id).toBe('abc-123')
    expect(resumo.origem).toBe('pos-reuniao')
    expect(resumo.salvoEm).toBe('2026-07-14T15:30:00.000Z')
    expect(resumo.titulo).toBe('Daily do time')
  })

  test('mapeia cada participante com nome, cargo, salário, tempo e custo', () => {
    expect(resumo.participantes).toEqual([
      {
        nome: 'Ana Silva',
        cargoTitulo: 'Programador de sistemas de informação',
        salario: 5500,
        custoHora: 25,
        segundos: 3715,
        custo: 25.7986,
      },
      {
        nome: 'Bruno Costa',
        cargoTitulo: undefined,
        salario: null,
        custoHora: 0,
        segundos: 3300,
        custo: 0,
      },
    ])
  })

  test('guarda total, fator de encargos e duração', () => {
    expect(resumo.total).toBeCloseTo(25.7986, 6)
    expect(resumo.fatorEncargos).toBe(1.0)
    expect(resumo.duracaoReuniaoSegundos).toBe(3730)
  })

  test('título e duração são opcionais', () => {
    const semTitulo = montarResumo({
      id: 'x',
      relatorio,
      origem: 'ao-vivo',
      fatorEncargos: 1.7,
      agora: new Date(),
    })
    expect(semTitulo.titulo).toBeUndefined()
    expect(semTitulo.duracaoReuniaoSegundos).toBeUndefined()
    expect(semTitulo.origem).toBe('ao-vivo')
  })
})
