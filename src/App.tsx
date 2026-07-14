import { useState } from 'react'
import { CargosScreen } from './features/cargos/CargosScreen'
import { HistoricoScreen } from './features/historico/HistoricoScreen'
import { ImportScreen } from './features/import/ImportScreen'
import { LiveScreen } from './features/live/LiveScreen'
import { MappingScreen } from './features/mapping/MappingScreen'
import { ReportScreen } from './features/report/ReportScreen'
import type { ReuniaoImportada } from './lib/csvParser'
import { CargosProvider } from './store/CargosContext'
import { useConfig } from './store/useConfig'
import { useHistorico } from './store/useHistorico'

type Passo = 'importar' | 'mapear' | 'relatorio'
type Modo = 'pos' | 'vivo' | 'cargos' | 'historico'

const ABAS: [Modo, string][] = [
  ['pos', 'Pós-reunião'],
  ['vivo', 'Ao vivo'],
  ['cargos', 'Cargos'],
  ['historico', 'Histórico'],
]

export default function App() {
  const { config, setConfig } = useConfig()
  const { historico, salvarResumo, excluirResumo } = useHistorico()
  const [modo, setModo] = useState<Modo>('pos')
  const [passo, setPasso] = useState<Passo>('importar')
  const [reuniao, setReuniao] = useState<ReuniaoImportada | null>(null)
  const [reuniaoId, setReuniaoId] = useState<string>('')

  const ordem: Passo[] = ['importar', 'mapear', 'relatorio']

  return (
    <CargosProvider config={config}>
      <header className="cabecalho">
        <div className="marca">
          MoneyWastedCallTeams<span className="centavos">,00</span>
        </div>
        <nav className="nav-modo" aria-label="Modo">
          {ABAS.map(([id, rotulo]) => (
            <button
              key={id}
              type="button"
              className={modo === id ? 'ativo' : undefined}
              onClick={() => setModo(id)}
            >
              {rotulo}
            </button>
          ))}
        </nav>
      </header>

      {modo === 'historico' ? (
        <HistoricoScreen historico={historico} onExcluir={excluirResumo} />
      ) : modo === 'cargos' ? (
        <CargosScreen config={config} setConfig={setConfig} />
      ) : modo === 'vivo' ? (
        <LiveScreen config={config} setConfig={setConfig} onArquivar={salvarResumo} />
      ) : (
        <>
          <div className="passos">
            {(
              [
                ['importar', 'Importar presença'],
                ['mapear', 'Mapear cargos'],
                ['relatorio', 'Relatório'],
              ] as const
            ).map(([id, rotulo], i) => (
              <span
                key={id}
                data-num={i + 1}
                className={`passo${passo === id ? ' ativo' : ''}${
                  ordem.indexOf(passo) > i ? ' feito' : ''
                }`}
              >
                {rotulo}
              </span>
            ))}
          </div>

          {passo === 'importar' && (
            <ImportScreen
              onImport={(r) => {
                setReuniao(r)
                setReuniaoId(crypto.randomUUID())
                setPasso('mapear')
              }}
            />
          )}

          {passo === 'mapear' && reuniao && (
            <MappingScreen
              reuniao={reuniao}
              config={config}
              setConfig={setConfig}
              onVerRelatorio={() => setPasso('relatorio')}
              onVoltar={() => setPasso('importar')}
            />
          )}

          {passo === 'relatorio' && reuniao && (
            <ReportScreen
              reuniao={reuniao}
              reuniaoId={reuniaoId}
              config={config}
              onArquivar={salvarResumo}
              onVoltar={() => setPasso('mapear')}
              onNovaImportacao={() => {
                setReuniao(null)
                setPasso('importar')
              }}
            />
          )}
        </>
      )}
    </CargosProvider>
  )
}
