import { custoHora, custoParticipante } from './cost'
import { resolverSalario, type CargoDataset, type Overrides, type ResolucaoSalario } from './salary'

export interface MapeamentoPessoa {
  cbo?: string
  uf?: string
}

export interface LinhaRelatorio {
  nome: string
  segundos: number
  cargoTitulo?: string
  salario: number | null
  fonte: ResolucaoSalario['fonte']
  custoHora: number
  custo: number
}

export interface Relatorio {
  linhas: LinhaRelatorio[]
  total: number
  naoResolvidos: number
}

export function montarRelatorio(params: {
  participantes: { nome: string; segundos: number }[]
  mapeamentos: Record<string, MapeamentoPessoa>
  dataset: CargoDataset
  fatorEncargos: number
  overrides?: Overrides
}): Relatorio {
  const { participantes, mapeamentos, dataset, fatorEncargos, overrides } = params

  const linhas = participantes.map((p): LinhaRelatorio => {
    const map = mapeamentos[p.nome]
    const resolucao = resolverSalario({
      pessoa: p.nome,
      cbo: map?.cbo,
      uf: map?.uf,
      dataset,
      overrides,
    })
    const hora = resolucao.salario !== null ? custoHora(resolucao.salario, fatorEncargos) : 0
    return {
      nome: p.nome,
      segundos: p.segundos,
      cargoTitulo: map?.cbo !== undefined ? dataset[map.cbo]?.titulo : undefined,
      salario: resolucao.salario,
      fonte: resolucao.fonte,
      custoHora: hora,
      custo: custoParticipante(hora, p.segundos),
    }
  })

  return {
    linhas,
    total: linhas.reduce((soma, l) => soma + l.custo, 0),
    naoResolvidos: linhas.filter((l) => l.fonte === 'nao-encontrado').length,
  }
}
