import { describe, expect, test } from 'vitest'
import { resolverSalario, type CargoDataset } from './salary'

const dataset: CargoDataset = {
  '252105': {
    titulo: 'Administrador',
    mediaNacional: 5000,
    porUF: { SP: 6200, RS: 4800 },
  },
  '317110': {
    titulo: 'Desenvolvedor de sistemas',
    mediaNacional: 7000,
  },
}

describe('resolverSalario — cadeia híbrida', () => {
  test('override da pessoa vence tudo', () => {
    const r = resolverSalario({
      pessoa: 'Ana Silva',
      cbo: '252105',
      uf: 'SP',
      dataset,
      overrides: { porPessoa: { 'Ana Silva': 12000 }, porCargo: { '252105': 9000 } },
    })
    expect(r).toEqual({ salario: 12000, fonte: 'override-pessoa' })
  })

  test('override do cargo vence o dataset', () => {
    const r = resolverSalario({
      pessoa: 'Bruno Costa',
      cbo: '252105',
      uf: 'SP',
      dataset,
      overrides: { porCargo: { '252105': 9000 } },
    })
    expect(r).toEqual({ salario: 9000, fonte: 'override-cargo' })
  })

  test('dataset com match de UF', () => {
    const r = resolverSalario({ pessoa: 'Carla Dias', cbo: '252105', uf: 'SP', dataset })
    expect(r).toEqual({ salario: 6200, fonte: 'dataset-uf' })
  })

  test('UF sem dado específico cai na média nacional', () => {
    const r = resolverSalario({ pessoa: 'Davi Rocha', cbo: '252105', uf: 'AM', dataset })
    expect(r).toEqual({ salario: 5000, fonte: 'dataset-nacional' })
  })

  test('cargo sem tabela por UF usa média nacional', () => {
    const r = resolverSalario({ pessoa: 'Elisa Melo', cbo: '317110', uf: 'SP', dataset })
    expect(r).toEqual({ salario: 7000, fonte: 'dataset-nacional' })
  })

  test('sem UF informada usa média nacional', () => {
    const r = resolverSalario({ pessoa: 'Fabio Luz', cbo: '252105', dataset })
    expect(r).toEqual({ salario: 5000, fonte: 'dataset-nacional' })
  })

  test('CBO desconhecido → não encontrado', () => {
    const r = resolverSalario({ pessoa: 'Gina Reis', cbo: '999999', uf: 'SP', dataset })
    expect(r).toEqual({ salario: null, fonte: 'nao-encontrado' })
  })

  test('sem CBO e sem override → não encontrado', () => {
    const r = resolverSalario({ pessoa: 'Hugo Neri', dataset })
    expect(r).toEqual({ salario: null, fonte: 'nao-encontrado' })
  })

  test('override da pessoa funciona mesmo sem CBO', () => {
    const r = resolverSalario({
      pessoa: 'Iris Prado',
      dataset,
      overrides: { porPessoa: { 'Iris Prado': 8000 } },
    })
    expect(r).toEqual({ salario: 8000, fonte: 'override-pessoa' })
  })
})
