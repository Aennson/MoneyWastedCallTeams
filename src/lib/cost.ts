/** Divisor mensal padrão da CLT (44h semanais). */
export const HORAS_MENSAIS_CLT = 220

/** Fator médio de encargos trabalhistas sobre o salário nominal no Brasil. */
export const FATOR_ENCARGOS_PADRAO = 1.7

export function custoHora(salarioMensal: number, fatorEncargos = FATOR_ENCARGOS_PADRAO): number {
  return (salarioMensal * fatorEncargos) / HORAS_MENSAIS_CLT
}

export function custoParticipante(custoHoraParticipante: number, segundos: number): number {
  return custoHoraParticipante * (segundos / 3600)
}

export function custoReuniao(participantes: { custoHora: number; segundos: number }[]): number {
  return participantes.reduce((total, p) => total + custoParticipante(p.custoHora, p.segundos), 0)
}
