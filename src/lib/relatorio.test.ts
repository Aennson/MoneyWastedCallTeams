import { describe, expect, test } from 'vitest'
import { montarRelatorio } from './relatorio'
import type { CargoDataset } from './salary'

const dataset: CargoDataset = {
  '317110': { titulo: 'Programador', mediaNacional: 5500, porUF: { SP: 6600 } },
  '142515': { titulo: 'Gerente de projetos de TI', mediaNacional: 12000 },
}

const participantes = [
  { nome: 'Ana Silva', segundos: 3600 },
  { nome: 'Bruno Costa', segundos: 1800 },
  { nome: 'Sem Cargo', segundos: 600 },
]

const mapeamentos = {
  'Ana Silva': { cbo: '317110', uf: 'SP' },
  'Bruno Costa': { cbo: '142515' },
}

describe('montarRelatorio', () => {
  const rel = montarRelatorio({ participantes, mapeamentos, dataset, fatorEncargos: 1.0 })

  test('calcula custo por participante com base no salário resolvido', () => {
    // Ana: 6600/220 = R$30/h por 1h = R$30
    expect(rel.linhas[0].custo).toBeCloseTo(30, 10)
    // Bruno: 12000/220 ≈ 54.5455/h por 0.5h ≈ 27.27
    expect(rel.linhas[1].custo).toBeCloseTo(27.2727, 3)
  })

  test('participante sem mapeamento entra com custo zero e fonte nao-encontrado', () => {
    expect(rel.linhas[2].custo).toBe(0)
    expect(rel.linhas[2].fonte).toBe('nao-encontrado')
  })

  test('total soma apenas os resolvidos', () => {
    expect(rel.total).toBeCloseTo(30 + 27.2727, 3)
  })

  test('indica quantos participantes ficaram sem salário', () => {
    expect(rel.naoResolvidos).toBe(1)
  })

  test('aplica o fator de encargos', () => {
    const comEncargos = montarRelatorio({ participantes, mapeamentos, dataset, fatorEncargos: 1.7 })
    expect(comEncargos.total).toBeCloseTo(rel.total * 1.7, 6)
  })

  test('expõe o título do cargo para exibição', () => {
    expect(rel.linhas[0].cargoTitulo).toBe('Programador')
    expect(rel.linhas[2].cargoTitulo).toBeUndefined()
  })
})
