import { fmtBRL, fmtDuracao } from '../../lib/format'
import type { ResumoReuniao } from '../../lib/historico'

const NOME_ORIGEM: Record<ResumoReuniao['origem'], string> = {
  'pos-reuniao': 'pós-reunião',
  'ao-vivo': 'ao vivo',
}

function dataLegivel(iso: string): string {
  return new Date(iso).toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function HistoricoScreen({
  historico,
  onExcluir,
}: {
  historico: ResumoReuniao[]
  onExcluir: (id: string) => void
}) {
  const totalGeral = historico.reduce((s, r) => s + r.total, 0)

  return (
    <>
      {historico.length > 0 && (
        <div className="stats">
          <div className="stat">
            <div className="stat-rotulo">Reuniões arquivadas</div>
            <div className="stat-valor">{historico.length}</div>
          </div>
          <div className="stat">
            <div className="stat-rotulo">Gasto acumulado</div>
            <div className="stat-valor" style={{ color: 'var(--prejuizo)' }}>
              {fmtBRL(totalGeral)}
            </div>
          </div>
        </div>
      )}

      <section className="cartao">
        <h2>Histórico de reuniões</h2>
        <p className="subtitulo">
          Cada reunião finalizada fica registrada aqui com participantes, salários considerados e o
          total gasto — os valores são os da época do arquivamento.
        </p>

        {historico.length === 0 && (
          <p className="subtitulo">
            Nada arquivado ainda. Feche um relatório pós-reunião ou use "Encerrar e arquivar" no
            modo ao vivo.
          </p>
        )}

        {historico.map((r) => (
          <details className="historico-item" key={r.id}>
            <summary>
              <span className="historico-data">{dataLegivel(r.salvoEm)}</span>
              <span className="historico-titulo">
                {r.titulo ?? 'Reunião sem título'}
                <span className="fonte-badge">{NOME_ORIGEM[r.origem]}</span>
              </span>
              <span className="historico-meta">
                {r.participantes.length} pessoa{r.participantes.length !== 1 ? 's' : ''}
                {r.duracaoReuniaoSegundos !== undefined &&
                  ` · ${fmtDuracao(r.duracaoReuniaoSegundos)}`}
              </span>
              <span className="historico-total">{fmtBRL(r.total)}</span>
            </summary>

            <div className="tabela-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Participante</th>
                    <th>Cargo</th>
                    <th className="num">Salário considerado</th>
                    <th className="num">Custo/hora</th>
                    <th className="num">Tempo</th>
                    <th className="num">Custo</th>
                  </tr>
                </thead>
                <tbody>
                  {[...r.participantes]
                    .sort((a, b) => b.custo - a.custo)
                    .map((p) => (
                      <tr key={p.nome}>
                        <td>{p.nome}</td>
                        <td>{p.cargoTitulo ?? (p.salario !== null ? 'salário manual' : '—')}</td>
                        <td className="num">{p.salario !== null ? fmtBRL(p.salario) : '—'}</td>
                        <td className="num">{p.salario !== null ? fmtBRL(p.custoHora) : '—'}</td>
                        <td className="num">{fmtDuracao(p.segundos)}</td>
                        <td className="num custo-linha">{fmtBRL(p.custo)}</td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>

            <div className="rodape-acoes">
              <span className="nota-metodo" style={{ margin: 0 }}>
                Fator de encargos usado: {r.fatorEncargos.toLocaleString('pt-BR')}
              </span>
              <button
                type="button"
                className="botao link perigo"
                onClick={() => onExcluir(r.id)}
              >
                excluir registro
              </button>
            </div>
          </details>
        ))}
      </section>
    </>
  )
}
