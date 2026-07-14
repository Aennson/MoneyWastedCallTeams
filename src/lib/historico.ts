import type { Relatorio } from './relatorio'

export interface ParticipanteResumo {
  nome: string
  cargoTitulo?: string
  /** Salário mensal considerado no cálculo (null = não resolvido, custo zero). */
  salario: number | null
  custoHora: number
  segundos: number
  custo: number
}

export interface ResumoReuniao {
  id: string
  /** Data/hora do arquivamento, ISO 8601. */
  salvoEm: string
  titulo?: string
  origem: 'pos-reuniao' | 'ao-vivo'
  fatorEncargos: number
  duracaoReuniaoSegundos?: number
  total: number
  participantes: ParticipanteResumo[]
}

/** Congela um relatório de reunião em um registro de histórico para consulta futura. */
export function montarResumo(params: {
  id: string
  relatorio: Relatorio
  origem: ResumoReuniao['origem']
  fatorEncargos: number
  titulo?: string
  duracaoReuniaoSegundos?: number
  agora: Date
}): ResumoReuniao {
  const { id, relatorio, origem, fatorEncargos, titulo, duracaoReuniaoSegundos, agora } = params
  return {
    id,
    salvoEm: agora.toISOString(),
    titulo,
    origem,
    fatorEncargos,
    duracaoReuniaoSegundos,
    total: relatorio.total,
    participantes: relatorio.linhas.map((l) => ({
      nome: l.nome,
      cargoTitulo: l.cargoTitulo,
      salario: l.salario,
      custoHora: l.custoHora,
      segundos: l.segundos,
      custo: l.custo,
    })),
  }
}
