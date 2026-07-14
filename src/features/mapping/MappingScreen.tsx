import type { ReuniaoImportada } from '../../lib/csvParser'
import { fmtBRL, fmtDuracao } from '../../lib/format'
import { resolverSalario } from '../../lib/salary'
import { useCargos } from '../../store/CargosContext'
import type { Config } from '../../store/useConfig'
import { CargoCombobox } from './CargoCombobox'

export const UFS = [
  'AC', 'AL', 'AM', 'AP', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA', 'MG', 'MS', 'MT',
  'PA', 'PB', 'PE', 'PI', 'PR', 'RJ', 'RN', 'RO', 'RR', 'RS', 'SC', 'SE', 'SP', 'TO',
]

const NOME_FONTE: Record<string, string> = {
  'override-pessoa': 'valor manual',
  'override-cargo': 'cargo manual',
  'dataset-uf': 'CAGED · UF',
  'dataset-nacional': 'CAGED · BR',
  'nao-encontrado': 'pendente',
}

export function MappingScreen({
  reuniao,
  config,
  setConfig,
  onVerRelatorio,
  onVoltar,
}: {
  reuniao: ReuniaoImportada
  config: Config
  setConfig: (fn: (c: Config) => Config) => void
  onVerRelatorio: () => void
  onVoltar: () => void
}) {
  const { dataset: cargos } = useCargos()
  const overrides = { porPessoa: config.overridesPessoa, porCargo: config.overridesCargo }

  const pendentes = reuniao.participantes.filter(
    (p) =>
      resolverSalario({
        pessoa: p.nome,
        cbo: config.mapeamentos[p.nome]?.cbo,
        uf: config.mapeamentos[p.nome]?.uf,
        dataset: cargos,
        overrides,
      }).salario === null,
  ).length

  function atualizarMapa(nome: string, mudanca: { cbo?: string; uf?: string }) {
    setConfig((c) => ({
      ...c,
      mapeamentos: { ...c.mapeamentos, [nome]: { ...c.mapeamentos[nome], ...mudanca } },
    }))
  }

  return (
    <section className="cartao">
      <h2>Quem é quem nessa reunião</h2>
      <p className="subtitulo">
        Informe o cargo e a UF de cada pessoa — fica salvo para as próximas reuniões. Se souber o
        salário real, preencha em "salário manual" que ele vence a estimativa.
      </p>

      <div className="tabela-wrap">
        <table>
          <thead>
            <tr>
              <th>Participante</th>
              <th className="num">Tempo</th>
              <th>Cargo</th>
              <th>UF</th>
              <th className="num">Salário manual</th>
              <th className="num">Salário considerado</th>
            </tr>
          </thead>
          <tbody>
            {reuniao.participantes.map((p) => {
              const mapa = config.mapeamentos[p.nome]
              const resolucao = resolverSalario({
                pessoa: p.nome,
                cbo: mapa?.cbo,
                uf: mapa?.uf,
                dataset: cargos,
                overrides,
              })
              return (
                <tr key={p.nome}>
                  <td>{p.nome}</td>
                  <td className="num">{fmtDuracao(p.segundos)}</td>
                  <td>
                    <CargoCombobox
                      cbo={mapa?.cbo}
                      onChange={(cbo) => atualizarMapa(p.nome, { cbo })}
                    />
                  </td>
                  <td>
                    <select
                      aria-label={`UF de ${p.nome}`}
                      value={mapa?.uf ?? ''}
                      onChange={(e) =>
                        atualizarMapa(p.nome, { uf: e.target.value || undefined })
                      }
                    >
                      <option value="">—</option>
                      {UFS.map((uf) => (
                        <option key={uf} value={uf}>
                          {uf}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="num">
                    <input
                      type="number"
                      min={0}
                      step={100}
                      placeholder="R$/mês"
                      aria-label={`Salário manual de ${p.nome}`}
                      value={config.overridesPessoa[p.nome] ?? ''}
                      onChange={(e) => {
                        const valor = e.target.value === '' ? undefined : Number(e.target.value)
                        setConfig((c) => {
                          const porPessoa = { ...c.overridesPessoa }
                          if (valor === undefined) delete porPessoa[p.nome]
                          else porPessoa[p.nome] = valor
                          return { ...c, overridesPessoa: porPessoa }
                        })
                      }}
                    />
                  </td>
                  <td className="num">
                    {resolucao.salario !== null ? fmtBRL(resolucao.salario) : '—'}
                    <span
                      className={`fonte-badge${
                        resolucao.fonte.startsWith('override')
                          ? ' override'
                          : resolucao.fonte === 'nao-encontrado'
                            ? ' pendente'
                            : ''
                      }`}
                    >
                      {NOME_FONTE[resolucao.fonte]}
                    </span>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      <div className="rodape-acoes">
        <label className="campo-encargos">
          Fator de encargos sobre o salário
          <input
            type="number"
            min={1}
            max={3}
            step={0.05}
            value={config.fatorEncargos}
            onChange={(e) =>
              setConfig((c) => ({ ...c, fatorEncargos: Number(e.target.value) || 1 }))
            }
          />
          <span title="Custo real do empregador: INSS, FGTS, 13º, férias, benefícios. 1,7 é uma média usual no regime CLT.">
            (1,7 ≈ custo CLT)
          </span>
        </label>
        <div style={{ display: 'flex', gap: 10 }}>
          <button type="button" className="botao secundario" onClick={onVoltar}>
            Importar outro arquivo
          </button>
          <button type="button" className="botao" onClick={onVerRelatorio}>
            {pendentes > 0 ? `Ver relatório (${pendentes} sem salário)` : 'Ver relatório'}
          </button>
        </div>
      </div>
    </section>
  )
}
