import type { MapeamentoPessoa } from './relatorio'

export interface PessoaVivo {
  nome: string
  cbo?: string
  uf?: string
  presente: boolean
  segundos: number
  origem: 'teams' | 'manual'
  /** Salário mensal válido só nesta sessão ao vivo — não persiste na configuração. */
  salarioSessao?: number
}

/**
 * Overrides de salário por pessoa para a sessão ao vivo: o salário de sessão
 * informado na inclusão vence o override persistido, sem alterá-lo.
 */
export function overridesDaSessao(
  pessoas: PessoaVivo[],
  base: Record<string, number>,
): Record<string, number> {
  const resultado = { ...base }
  for (const p of pessoas) {
    if (p.salarioSessao !== undefined) resultado[p.nome] = p.salarioSessao
  }
  return resultado
}

function normalizar(nome: string): string {
  return nome.trim().replace(/\s+/g, ' ')
}

/**
 * Aplica um snapshot do roster do Teams à sala ao vivo:
 * novos nomes entram (com cargo/UF do mapeamento salvo), quem sumiu fica
 * ausente (tempo congela), quem voltou fica presente. Pessoas de origem
 * manual nunca são alteradas.
 */
export function sincronizarRoster(
  pessoas: PessoaVivo[],
  nomesRoster: string[],
  mapeamentos: Record<string, MapeamentoPessoa>,
): PessoaVivo[] {
  const noRoster = new Set(nomesRoster.map(normalizar))

  const atualizadas = pessoas.map((p) => {
    if (p.origem === 'manual') return p
    const presente = noRoster.has(normalizar(p.nome))
    return presente === p.presente ? p : { ...p, presente }
  })

  const nomesExistentes = new Set(pessoas.map((p) => normalizar(p.nome)))
  const novas = nomesRoster
    .map(normalizar)
    .filter((nome, i, arr) => nome !== '' && !nomesExistentes.has(nome) && arr.indexOf(nome) === i)
    .map(
      (nome): PessoaVivo => ({
        nome,
        cbo: mapeamentos[nome]?.cbo,
        uf: mapeamentos[nome]?.uf,
        presente: true,
        segundos: 0,
        origem: 'teams',
      }),
    )

  return [...atualizadas, ...novas]
}
