import { useEffect } from 'react'
import type { ReuniaoImportada } from '../../lib/csvParser'
import { fmtBRL, fmtDuracao } from '../../lib/format'
import { montarResumo, type ResumoReuniao } from '../../lib/historico'
import { montarRelatorio } from '../../lib/relatorio'
import { useCargos } from '../../store/CargosContext'
import type { Config } from '../../store/useConfig'
import { Taximetro } from './Taximetro'

export function ReportScreen({
  reuniao,
  reuniaoId,
  config,
  onArquivar,
  onVoltar,
  onNovaImportacao,
}: {
  reuniao: ReuniaoImportada
  reuniaoId: string
  config: Config
  onArquivar: (resumo: ResumoReuniao) => void
  onVoltar: () => void
  onNovaImportacao: () => void
}) {
  const { dataset: cargos } = useCargos()
  const rel = montarRelatorio({
    participantes: reuniao.participantes,
    mapeamentos: config.mapeamentos,
    dataset: cargos,
    fatorEncargos: config.fatorEncargos,
    overrides: { porPessoa: config.overridesPessoa, porCargo: config.overridesCargo },
  })

  // Arquiva (e re-arquiva a cada ajuste) o resumo desta reunião no histórico
  const relJson = JSON.stringify(rel)
  useEffect(() => {
    onArquivar(
      montarResumo({
        id: reuniaoId,
        relatorio: rel,
        origem: 'pos-reuniao',
        fatorEncargos: config.fatorEncargos,
        titulo: reuniao.titulo,
        duracaoReuniaoSegundos: reuniao.duracaoReuniaoSegundos,
        agora: new Date(),
      }),
    )
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reuniaoId, relJson, config.fatorEncargos])

  const segundosSomados = rel.linhas.reduce((s, l) => s + l.segundos, 0)
  const duracaoReuniao = reuniao.duracaoReuniaoSegundos
  const custoPorMinuto = duracaoReuniao ? rel.total / (duracaoReuniao / 60) : null
  const linhasOrdenadas = [...rel.linhas].sort((a, b) => b.custo - a.custo)

  return (
    <>
      <Taximetro
        valor={rel.total}
        rotulo="Essa reunião custou"
        titulo={reuniao.titulo ? `"${reuniao.titulo}"` : undefined}
      />

      <div className="stats">
        <div className="stat">
          <div className="stat-rotulo">Pessoas</div>
          <div className="stat-valor">{rel.linhas.length}</div>
        </div>
        <div className="stat">
          <div className="stat-rotulo">Tempo somado (pessoa-hora)</div>
          <div className="stat-valor">{fmtDuracao(segundosSomados)}</div>
        </div>
        {duracaoReuniao !== undefined && (
          <div className="stat">
            <div className="stat-rotulo">Duração da reunião</div>
            <div className="stat-valor">{fmtDuracao(duracaoReuniao)}</div>
          </div>
        )}
        {custoPorMinuto !== null && (
          <div className="stat">
            <div className="stat-rotulo">Custo por minuto</div>
            <div className="stat-valor">{fmtBRL(custoPorMinuto)}</div>
          </div>
        )}
      </div>

      {rel.naoResolvidos > 0 && (
        <p className="aviso">
          {rel.naoResolvidos} participante{rel.naoResolvidos > 1 ? 's' : ''} sem cargo/salário
          definido — entra{rel.naoResolvidos > 1 ? 'm' : ''} como R$ 0,00 no total. Volte ao
          mapeamento para completar.
        </p>
      )}

      <section className="cartao">
        <h2>Extrato por participante</h2>
        <div className="tabela-wrap">
          <table>
            <thead>
              <tr>
                <th>Participante</th>
                <th>Cargo</th>
                <th className="num">Tempo</th>
                <th className="num">Salário-base</th>
                <th className="num">Custo/hora</th>
                <th className="num">Custo</th>
                <th className="num">% do total</th>
              </tr>
            </thead>
            <tbody>
              {linhasOrdenadas.map((l) => (
                <tr key={l.nome}>
                  <td>{l.nome}</td>
                  <td>{l.cargoTitulo ?? (l.fonte === 'override-pessoa' ? 'salário manual' : '—')}</td>
                  <td className="num">{fmtDuracao(l.segundos)}</td>
                  <td className="num">{l.salario !== null ? fmtBRL(l.salario) : '—'}</td>
                  <td className="num">{l.salario !== null ? fmtBRL(l.custoHora) : '—'}</td>
                  <td className="num custo-linha">{fmtBRL(l.custo)}</td>
                  <td className="num">
                    {rel.total > 0 ? `${((l.custo / rel.total) * 100).toFixed(0)}%` : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <p className="nota-metodo">
          ✓ Resumo arquivado na aba Histórico — ajustes feitos aqui atualizam o registro.
          <br />
          Método: custo/hora = salário mensal × fator de encargos ({config.fatorEncargos.toLocaleString('pt-BR')}) ÷ 220h
          (CLT). Salários estimados a partir de médias do mercado formal (referência Novo
          CAGED/RAIS, aproximadas por cargo e UF) — valores manuais têm precedência. Isto é uma
          estimativa para provocar boas conversas sobre reuniões, não um relatório contábil.
        </p>

        <div className="rodape-acoes">
          <button type="button" className="botao secundario" onClick={onVoltar}>
            Ajustar cargos e salários
          </button>
          <button type="button" className="botao" onClick={onNovaImportacao}>
            Analisar outra reunião
          </button>
        </div>
      </section>
    </>
  )
}
