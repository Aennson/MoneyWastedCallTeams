import { useMemo, useState } from 'react'
import type { CargoCustom } from '../../lib/cargoStore'
import { proximoCodigoCustom } from '../../lib/cargoStore'
import { fmtBRL } from '../../lib/format'
import { seedDataset, seedIndice } from '../../store/CargosContext'
import type { Config } from '../../store/useConfig'
import { UFS } from '../mapping/MappingScreen'

type Origem = 'padrão' | 'editado' | 'personalizado'

interface LinhaCargo {
  codigo: string
  titulo: string
  mediaNacional: number
  aliases: string[]
  origem: Origem
  oculto: boolean
}

interface Rascunho {
  codigo: string | null // null = criando
  titulo: string
  salario: string
  aliases: string
  porUF: Record<string, string>
}

const RASCUNHO_VAZIO: Rascunho = { codigo: null, titulo: '', salario: '', aliases: '', porUF: {} }

function normalizarBusca(t: string) {
  return t
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
}

export function CargosScreen({
  config,
  setConfig,
}: {
  config: Config
  setConfig: (fn: (c: Config) => Config) => void
}) {
  const [busca, setBusca] = useState('')
  const [mostrarOcultos, setMostrarOcultos] = useState(false)
  const [rascunho, setRascunho] = useState<Rascunho | null>(null)
  const [erro, setErro] = useState<string | null>(null)

  const aliasesSeed = useMemo(
    () => Object.fromEntries(seedIndice.map((e) => [e.cbo, e.aliases])),
    [],
  )

  const linhas = useMemo((): LinhaCargo[] => {
    const ocultos = new Set(config.cargosOcultos)
    const todas: LinhaCargo[] = []
    for (const [codigo, info] of Object.entries(seedDataset)) {
      const sombra = config.cargosCustom[codigo]
      const efetivo = sombra ?? info
      todas.push({
        codigo,
        titulo: efetivo.titulo,
        mediaNacional: efetivo.mediaNacional,
        aliases: [...new Set([...(aliasesSeed[codigo] ?? []), ...(sombra?.aliases ?? [])])],
        origem: sombra ? 'editado' : 'padrão',
        oculto: ocultos.has(codigo),
      })
    }
    for (const [codigo, info] of Object.entries(config.cargosCustom)) {
      if (codigo in seedDataset) continue
      todas.push({
        codigo,
        titulo: info.titulo,
        mediaNacional: info.mediaNacional,
        aliases: info.aliases ?? [],
        origem: 'personalizado',
        oculto: ocultos.has(codigo),
      })
    }
    return todas.sort((a, b) => a.titulo.localeCompare(b.titulo, 'pt-BR'))
  }, [config.cargosCustom, config.cargosOcultos, aliasesSeed])

  const filtradas = useMemo(() => {
    const q = normalizarBusca(busca.trim())
    return linhas.filter((l) => {
      if (l.oculto && !mostrarOcultos) return false
      if (q === '') return true
      const alvo = normalizarBusca(`${l.titulo} ${l.codigo} ${l.aliases.join(' ')}`)
      return alvo.includes(q)
    })
  }, [linhas, busca, mostrarOcultos])

  const totalOcultos = linhas.filter((l) => l.oculto).length

  function abrirCriacao() {
    setErro(null)
    setRascunho({ ...RASCUNHO_VAZIO, porUF: {} })
  }

  function abrirEdicao(l: LinhaCargo) {
    setErro(null)
    const atual = config.cargosCustom[l.codigo] ?? seedDataset[l.codigo]
    setRascunho({
      codigo: l.codigo,
      titulo: atual.titulo,
      salario: String(atual.mediaNacional),
      aliases: (config.cargosCustom[l.codigo]?.aliases ?? []).join(', '),
      porUF: Object.fromEntries(
        Object.entries(atual.porUF ?? {}).map(([uf, v]) => [uf, String(v)]),
      ),
    })
  }

  function salvar() {
    if (!rascunho) return
    const titulo = rascunho.titulo.trim()
    const salario = Number(rascunho.salario)
    if (titulo === '') {
      setErro('Informe o nome do cargo.')
      return
    }
    if (!Number.isFinite(salario) || salario <= 0) {
      setErro('Informe um salário médio mensal maior que zero.')
      return
    }
    const porUF: Record<string, number> = {}
    for (const [uf, texto] of Object.entries(rascunho.porUF)) {
      const v = Number(texto)
      if (texto.trim() !== '' && Number.isFinite(v) && v > 0) porUF[uf] = v
    }
    const cargo: CargoCustom = {
      titulo,
      mediaNacional: salario,
      ...(Object.keys(porUF).length > 0 ? { porUF } : {}),
      aliases: rascunho.aliases
        .split(',')
        .map((a) => a.trim())
        .filter(Boolean),
    }
    const codigo =
      rascunho.codigo ??
      proximoCodigoCustom([...Object.keys(seedDataset), ...Object.keys(config.cargosCustom)])
    setConfig((c) => ({ ...c, cargosCustom: { ...c.cargosCustom, [codigo]: cargo } }))
    setRascunho(null)
  }

  function excluirOuOcultar(l: LinhaCargo) {
    setConfig((c) => {
      if (l.origem === 'personalizado') {
        const custom = { ...c.cargosCustom }
        delete custom[l.codigo]
        return { ...c, cargosCustom: custom }
      }
      // cargo do padrão: oculta (reversível) e descarta a edição, se houver
      const custom = { ...c.cargosCustom }
      delete custom[l.codigo]
      return {
        ...c,
        cargosCustom: custom,
        cargosOcultos: [...new Set([...c.cargosOcultos, l.codigo])],
      }
    })
  }

  function restaurar(l: LinhaCargo) {
    setConfig((c) => {
      const custom = { ...c.cargosCustom }
      delete custom[l.codigo]
      return {
        ...c,
        cargosCustom: custom,
        cargosOcultos: c.cargosOcultos.filter((x) => x !== l.codigo),
      }
    })
  }

  return (
    <section className="cartao">
      <div className="cargos-topo">
        <div>
          <h2>Cargos e salários</h2>
          <p className="subtitulo">
            A base de referência (CAGED aproximado) pode ser editada à vontade — suas alterações
            valem em todo o app e ficam salvas neste navegador.
          </p>
        </div>
        <button type="button" className="botao" onClick={abrirCriacao}>
          + Novo cargo
        </button>
      </div>

      <div className="cargos-filtros">
        <input
          type="text"
          placeholder="Filtrar por nome, código ou apelido…"
          aria-label="Filtrar cargos"
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
        />
        {totalOcultos > 0 && (
          <label className="campo-encargos">
            <input
              type="checkbox"
              checked={mostrarOcultos}
              onChange={(e) => setMostrarOcultos(e.target.checked)}
            />
            mostrar ocultos ({totalOcultos})
          </label>
        )}
      </div>

      {rascunho && (
        <div className="editor-cargo">
          <h3>{rascunho.codigo ? `Editando ${rascunho.codigo}` : 'Novo cargo'}</h3>
          <div className="editor-grid">
            <label>
              Nome do cargo
              <input
                type="text"
                value={rascunho.titulo}
                autoFocus
                placeholder="ex.: Scrum Master"
                onChange={(e) => setRascunho({ ...rascunho, titulo: e.target.value })}
              />
            </label>
            <label>
              Salário médio nacional (R$/mês)
              <input
                type="number"
                min={0}
                step={100}
                value={rascunho.salario}
                onChange={(e) => setRascunho({ ...rascunho, salario: e.target.value })}
              />
            </label>
            <label className="editor-aliases">
              Apelidos para busca (separados por vírgula)
              <input
                type="text"
                value={rascunho.aliases}
                placeholder="ex.: agilista, scrum"
                onChange={(e) => setRascunho({ ...rascunho, aliases: e.target.value })}
              />
            </label>
          </div>

          <details className="editor-ufs">
            <summary>
              Salário por UF (opcional — em branco usa a média nacional
              {Object.keys(rascunho.porUF).filter((uf) => rascunho.porUF[uf]?.trim()).length > 0
                ? `; ${Object.keys(rascunho.porUF).filter((uf) => rascunho.porUF[uf]?.trim()).length} preenchidas`
                : ''}
              )
            </summary>
            <div className="grade-ufs">
              {UFS.map((uf) => (
                <label key={uf}>
                  {uf}
                  <input
                    type="number"
                    min={0}
                    step={100}
                    value={rascunho.porUF[uf] ?? ''}
                    onChange={(e) =>
                      setRascunho({
                        ...rascunho,
                        porUF: { ...rascunho.porUF, [uf]: e.target.value },
                      })
                    }
                  />
                </label>
              ))}
            </div>
          </details>

          {erro && <p className="erro">{erro}</p>}

          <div className="rodape-acoes">
            <button type="button" className="botao secundario" onClick={() => setRascunho(null)}>
              Cancelar
            </button>
            <button type="button" className="botao" onClick={salvar}>
              {rascunho.codigo ? 'Salvar alterações' : 'Criar cargo'}
            </button>
          </div>
        </div>
      )}

      <div className="tabela-wrap">
        <table>
          <thead>
            <tr>
              <th>Código</th>
              <th>Cargo</th>
              <th className="num">Salário BR</th>
              <th>Origem</th>
              <th className="num">Ações</th>
            </tr>
          </thead>
          <tbody>
            {filtradas.map((l) => (
              <tr key={l.codigo} className={l.oculto ? 'linha-oculta' : undefined}>
                <td className="num">{l.codigo}</td>
                <td>
                  {l.titulo}
                  {l.aliases.length > 0 && (
                    <span className="aliases-dica"> · {l.aliases.slice(0, 3).join(', ')}</span>
                  )}
                </td>
                <td className="num">{fmtBRL(l.mediaNacional)}</td>
                <td>
                  <span
                    className={`fonte-badge${l.origem !== 'padrão' ? ' override' : ''}${
                      l.oculto ? ' pendente' : ''
                    }`}
                  >
                    {l.oculto ? 'oculto' : l.origem}
                  </span>
                </td>
                <td className="num acoes-cargo">
                  {l.oculto ? (
                    <button type="button" className="botao link" onClick={() => restaurar(l)}>
                      restaurar
                    </button>
                  ) : (
                    <>
                      <button type="button" className="botao link" onClick={() => abrirEdicao(l)}>
                        editar
                      </button>
                      {l.origem === 'editado' && (
                        <button
                          type="button"
                          className="botao link"
                          title="Descarta suas alterações e volta ao valor padrão"
                          onClick={() => restaurar(l)}
                        >
                          restaurar padrão
                        </button>
                      )}
                      <button
                        type="button"
                        className="botao link perigo"
                        onClick={() => excluirOuOcultar(l)}
                      >
                        {l.origem === 'personalizado' ? 'excluir' : 'ocultar'}
                      </button>
                    </>
                  )}
                </td>
              </tr>
            ))}
            {filtradas.length === 0 && (
              <tr>
                <td colSpan={5} className="vazio-tabela">
                  Nenhum cargo encontrado{busca ? ` para "${busca}"` : ''}.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <p className="nota-metodo">
        "Ocultar" tira um cargo padrão da busca sem apagar nada (reversível em "mostrar ocultos").
        "Excluir" remove de vez um cargo criado por você. Cargos editados exibem o selo "editado" e
        podem voltar ao padrão a qualquer momento.
      </p>
    </section>
  )
}
