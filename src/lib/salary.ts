export interface CargoInfo {
  titulo: string
  /** Salário médio mensal nacional (CAGED, aproximado). */
  mediaNacional: number
  /** Salário médio mensal por UF, quando disponível. */
  porUF?: Record<string, number>
}

export type CargoDataset = Record<string, CargoInfo>

export interface Overrides {
  /** Nome da pessoa → salário mensal informado manualmente. */
  porPessoa?: Record<string, number>
  /** Código CBO → salário mensal informado manualmente. */
  porCargo?: Record<string, number>
}

export type FonteSalario = 'override-pessoa' | 'override-cargo' | 'dataset-uf' | 'dataset-nacional'

export type ResolucaoSalario =
  | { salario: number; fonte: FonteSalario }
  | { salario: null; fonte: 'nao-encontrado' }

export function resolverSalario(params: {
  pessoa: string
  cbo?: string
  uf?: string
  dataset: CargoDataset
  overrides?: Overrides
}): ResolucaoSalario {
  const { pessoa, cbo, uf, dataset, overrides } = params

  const porPessoa = overrides?.porPessoa?.[pessoa]
  if (porPessoa !== undefined) return { salario: porPessoa, fonte: 'override-pessoa' }

  if (cbo !== undefined) {
    const porCargo = overrides?.porCargo?.[cbo]
    if (porCargo !== undefined) return { salario: porCargo, fonte: 'override-cargo' }

    const info = dataset[cbo]
    if (info) {
      const porUF = uf !== undefined ? info.porUF?.[uf] : undefined
      if (porUF !== undefined) return { salario: porUF, fonte: 'dataset-uf' }
      return { salario: info.mediaNacional, fonte: 'dataset-nacional' }
    }
  }

  return { salario: null, fonte: 'nao-encontrado' }
}
