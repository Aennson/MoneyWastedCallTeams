import { useEffect, useRef, useState } from 'react'
import { fmtBRL, fmtDuracao } from '../../lib/format'
import { montarResumo, type ResumoReuniao } from '../../lib/historico'
import { montarRelatorio } from '../../lib/relatorio'
import { overridesDaSessao, sincronizarRoster, type PessoaVivo } from '../../lib/rosterSync'
import { useCargos } from '../../store/CargosContext'
import type { Config } from '../../store/useConfig'
import { CargoCombobox } from '../mapping/CargoCombobox'
import { UFS } from '../mapping/MappingScreen'
import { Taximetro } from '../report/Taximetro'

interface SnapshotRoster {
  nomes: string[]
  titulo?: string
  recebidoEm: number
}

export function LiveScreen({
  config,
  setConfig,
  onArquivar,
}: {
  config: Config
  setConfig: (fn: (c: Config) => Config) => void
  onArquivar: (resumo: ResumoReuniao) => void
}) {
  const { dataset: cargos } = useCargos()
  const [pessoas, setPessoas] = useState<PessoaVivo[]>([])
  const [rodando, setRodando] = useState(false)
  const [novoNome, setNovoNome] = useState('')
  const [novoCbo, setNovoCbo] = useState<string | undefined>()
  const [novaUf, setNovaUf] = useState('')
  const [novoSalario, setNovoSalario] = useState('')
  const [syncTeams, setSyncTeams] = useState(false)
  const [ultimoSnapshot, setUltimoSnapshot] = useState<SnapshotRoster | null>(null)
  const [arquivada, setArquivada] = useState(false)
  const autoIniciou = useRef(false)

  useEffect(() => {
    if (!rodando) return
    const id = setInterval(() => {
      setPessoas((atual) =>
        atual.map((p) => (p.presente ? { ...p, segundos: p.segundos + 1 } : p)),
      )
    }, 1000)
    return () => clearInterval(id)
  }, [rodando])

  // Sincronização com o Teams Web via extensão (bridge /api/roster)
  useEffect(() => {
    if (!syncTeams) {
      autoIniciou.current = false
      return
    }
    let ativo = true
    const buscar = async () => {
      try {
        const resp = await fetch('/api/roster')
        const snap = (await resp.json()) as SnapshotRoster | null
        if (!ativo || !snap) return
        setUltimoSnapshot(snap)
        // snapshot velho (reunião anterior / extensão parada) não popula a sala
        if (Date.now() - snap.recebidoEm > 30_000) return
        setPessoas((atual) => sincronizarRoster(atual, snap.nomes, config.mapeamentos))
        if (snap.nomes.length > 0 && !autoIniciou.current) {
          autoIniciou.current = true
          setRodando(true)
        }
      } catch {
        // dev server fora do ar — o indicador já mostra a ausência de dados
      }
    }
    void buscar()
    const id = setInterval(buscar, 3000)
    return () => {
      ativo = false
      clearInterval(id)
    }
  }, [syncTeams, config.mapeamentos])

  const rel = montarRelatorio({
    participantes: pessoas,
    mapeamentos: Object.fromEntries(pessoas.map((p) => [p.nome, { cbo: p.cbo, uf: p.uf }])),
    dataset: cargos,
    fatorEncargos: config.fatorEncargos,
    overrides: {
      porPessoa: overridesDaSessao(pessoas, config.overridesPessoa),
      porCargo: config.overridesCargo,
    },
  })
  const custoPorNome = new Map(rel.linhas.map((l) => [l.nome, l]))

  const conhecidosDisponiveis = Object.keys(config.mapeamentos).filter(
    (nome) => !pessoas.some((p) => p.nome === nome),
  )

  function adicionar(nome: string, cbo?: string, uf?: string, salarioSessao?: number) {
    const limpo = nome.trim()
    if (limpo === '' || pessoas.some((p) => p.nome === limpo)) return
    setPessoas((atual) => [
      ...atual,
      { nome: limpo, cbo, uf, presente: true, segundos: 0, origem: 'manual', salarioSessao },
    ])
  }

  function definirCargo(nome: string, cbo: string | undefined) {
    setPessoas((atual) => atual.map((p) => (p.nome === nome ? { ...p, cbo } : p)))
    // salva no mapeamento para as próximas reuniões
    if (cbo !== undefined) {
      setConfig((c) => ({
        ...c,
        mapeamentos: { ...c.mapeamentos, [nome]: { ...c.mapeamentos[nome], cbo } },
      }))
    }
  }

  const atrasoSnapshot =
    ultimoSnapshot !== null ? Math.round((Date.now() - ultimoSnapshot.recebidoEm) / 1000) : null

  return (
    <>
      <Taximetro
        valor={rel.total}
        rotulo="Custo acumulado agora"
        titulo={syncTeams ? ultimoSnapshot?.titulo : undefined}
        rodando={rodando}
      />

      <div className="stats">
        <div className="stat">
          <div className="stat-rotulo">Na sala agora</div>
          <div className="stat-valor">
            {pessoas.filter((p) => p.presente).length}/{pessoas.length}
          </div>
        </div>
        <div className="stat">
          <div className="stat-rotulo">Queimando por minuto</div>
          <div className="stat-valor">
            {fmtBRL(
              pessoas
                .filter((p) => p.presente)
                .reduce((s, p) => s + (custoPorNome.get(p.nome)?.custoHora ?? 0) / 60, 0),
            )}
          </div>
        </div>
      </div>

      <section className="cartao">
        <h2>Reunião ao vivo</h2>
        <p className="subtitulo">
          Monte a sala manualmente ou ligue a sincronização com o Teams Web — com a extensão
          instalada e o painel Participantes aberto, quem entra e sai é detectado sozinho.
        </p>

        <div className="rodape-acoes" style={{ marginTop: 0, marginBottom: 14 }}>
          <button
            type="button"
            className={`toggle-presenca${syncTeams ? ' presente' : ''}`}
            onClick={() => setSyncTeams(!syncTeams)}
          >
            {syncTeams ? '● Sincronizando com Teams Web' : '○ Sincronizar com Teams Web'}
          </button>
          {syncTeams &&
            (ultimoSnapshot === null || atrasoSnapshot === null || atrasoSnapshot > 15 ? (
              <span className="fonte-badge pendente">
                nenhum dado do Teams — extensão carregada? painel Participantes aberto?
              </span>
            ) : (
              <span className="fonte-badge override">
                recebendo do Teams (há {atrasoSnapshot}s)
              </span>
            ))}
        </div>

        {pessoas.map((p) => {
          const linha = custoPorNome.get(p.nome)
          return (
            <div className="linha-pessoa-vivo" key={p.nome}>
              <button
                type="button"
                className={`toggle-presenca${p.presente ? ' presente' : ''}`}
                onClick={() =>
                  setPessoas((atual) =>
                    atual.map((x) => (x.nome === p.nome ? { ...x, presente: !x.presente } : x)),
                  )
                }
              >
                {p.presente ? 'na sala' : 'saiu'}
              </button>
              <span className="nome">
                {p.nome}
                {p.origem === 'teams' && <span className="fonte-badge">teams</span>}
                {p.cbo !== undefined ? (
                  <span className="fonte-badge">{cargos[p.cbo]?.titulo ?? p.cbo}</span>
                ) : linha?.fonte === 'override-pessoa' ? (
                  <span className="fonte-badge override">
                    {p.salarioSessao !== undefined ? 'salário da sessão' : 'salário manual'}
                  </span>
                ) : (
                  <span style={{ display: 'inline-block', marginLeft: 8, verticalAlign: 'middle' }}>
                    <CargoCombobox
                      cbo={p.cbo}
                      onChange={(cbo) => definirCargo(p.nome, cbo)}
                      placeholder="definir cargo…"
                    />
                  </span>
                )}
              </span>
              <input
                type="number"
                className="salario-sessao"
                min={0}
                step={100}
                placeholder="R$/mês"
                title="Salário só para esta sessão — não fica salvo"
                aria-label={`Salário de sessão de ${p.nome}`}
                value={p.salarioSessao ?? ''}
                onChange={(e) => {
                  const valor = e.target.value === '' ? undefined : Number(e.target.value)
                  setPessoas((atual) =>
                    atual.map((x) => (x.nome === p.nome ? { ...x, salarioSessao: valor } : x)),
                  )
                }}
              />
              <span className="tempo">{fmtDuracao(p.segundos)}</span>
              <span className="custo">{fmtBRL(linha?.custo ?? 0)}</span>
              <button
                type="button"
                className="botao link"
                aria-label={`Remover ${p.nome}`}
                onClick={() => setPessoas((atual) => atual.filter((x) => x.nome !== p.nome))}
              >
                remover
              </button>
            </div>
          )
        })}

        {pessoas.length === 0 && (
          <p className="subtitulo">
            Ninguém na sala ainda — adicione abaixo ou ligue a sincronização.
          </p>
        )}

        {conhecidosDisponiveis.length > 0 && (
          <div style={{ marginTop: 14 }}>
            <select
              aria-label="Adicionar pessoa já mapeada"
              value=""
              onChange={(e) => {
                const nome = e.target.value
                if (nome) {
                  const m = config.mapeamentos[nome]
                  adicionar(nome, m?.cbo, m?.uf)
                }
              }}
            >
              <option value="">+ Adicionar pessoa já conhecida…</option>
              {conhecidosDisponiveis.map((nome) => (
                <option key={nome} value={nome}>
                  {nome}
                </option>
              ))}
            </select>
          </div>
        )}

        <div className="add-pessoa">
          <input
            type="text"
            placeholder="Nome"
            aria-label="Nome da nova pessoa"
            value={novoNome}
            onChange={(e) => setNovoNome(e.target.value)}
          />
          <CargoCombobox cbo={novoCbo} onChange={setNovoCbo} />
          <select
            aria-label="UF da nova pessoa"
            value={novaUf}
            onChange={(e) => setNovaUf(e.target.value)}
          >
            <option value="">UF</option>
            {UFS.map((uf) => (
              <option key={uf} value={uf}>
                {uf}
              </option>
            ))}
          </select>
          <input
            type="number"
            min={0}
            step={100}
            placeholder="Salário (só nesta sessão)"
            title="Se preenchido, vence a estimativa do cargo — vale só para esta sessão"
            aria-label="Salário de sessão da nova pessoa"
            value={novoSalario}
            onChange={(e) => setNovoSalario(e.target.value)}
          />
          <button
            type="button"
            className="botao secundario"
            onClick={() => {
              const salario = Number(novoSalario)
              adicionar(
                novoNome,
                novoCbo,
                novaUf || undefined,
                novoSalario.trim() !== '' && salario > 0 ? salario : undefined,
              )
              setNovoNome('')
              setNovoCbo(undefined)
              setNovaUf('')
              setNovoSalario('')
            }}
          >
            Adicionar
          </button>
        </div>

        <div className="controles-vivo">
          <button
            type="button"
            className="botao"
            onClick={() => {
              if (!rodando) setArquivada(false)
              setRodando(!rodando)
            }}
          >
            {rodando ? 'Pausar' : pessoas.some((p) => p.segundos > 0) ? 'Retomar' : 'Iniciar reunião'}
          </button>
          <button
            type="button"
            className="botao secundario"
            disabled={!pessoas.some((p) => p.segundos > 0)}
            onClick={() => {
              onArquivar(
                montarResumo({
                  id: crypto.randomUUID(),
                  relatorio: rel,
                  origem: 'ao-vivo',
                  fatorEncargos: config.fatorEncargos,
                  titulo: syncTeams ? ultimoSnapshot?.titulo : undefined,
                  duracaoReuniaoSegundos: Math.max(...pessoas.map((p) => p.segundos), 0),
                  agora: new Date(),
                }),
              )
              setRodando(false)
              setPessoas((atual) => atual.map((p) => ({ ...p, segundos: 0, presente: true })))
              setArquivada(true)
            }}
          >
            Encerrar e arquivar
          </button>
          <button
            type="button"
            className="botao secundario"
            disabled={!pessoas.some((p) => p.segundos > 0)}
            onClick={() => {
              setRodando(false)
              setPessoas((atual) => atual.map((p) => ({ ...p, segundos: 0, presente: true })))
            }}
          >
            Zerar sem salvar
          </button>
          {arquivada && (
            <span className="fonte-badge override" style={{ alignSelf: 'center' }}>
              ✓ reunião arquivada no histórico
            </span>
          )}
        </div>
      </section>
    </>
  )
}
