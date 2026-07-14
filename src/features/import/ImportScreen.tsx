import { useRef, useState } from 'react'
import { decodeAttendanceFile, parseTeamsAttendance, type ReuniaoImportada } from '../../lib/csvParser'

const EXEMPLO = [
  '1. Resumo',
  'Título da reunião\tAlinhamento semanal do time',
  'Duração da reunião\t1h 2m 10s',
  '',
  '2. Participantes',
  'Nome\tPrimeiro ingresso\tÚltima saída\tDuração na reunião\tEmail\tID do participante (UPN)\tFunção',
  'Ana Silva\t10:00\t11:02\t1h 1m 55s\tana@empresa.com\tana@empresa.com\tOrganizador',
  'Bruno Costa\t10:05\t11:00\t55m\tbruno@empresa.com\tbruno@empresa.com\tApresentador',
  'Carla Dias\t10:30\t11:02\t32m 10s\tcarla@empresa.com\tcarla@empresa.com\tParticipante',
  'Davi Rocha\t10:02\t11:02\t1h\tdavi@empresa.com\tdavi@empresa.com\tParticipante',
].join('\r\n')

export function ImportScreen({ onImport }: { onImport: (r: ReuniaoImportada) => void }) {
  const [erro, setErro] = useState<string | null>(null)
  const [arrastando, setArrastando] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  async function processar(arquivo: File) {
    setErro(null)
    const conteudo = decodeAttendanceFile(await arquivo.arrayBuffer())
    const reuniao = parseTeamsAttendance(conteudo)
    if (reuniao.participantes.length === 0) {
      setErro(
        'Nenhum participante encontrado no arquivo. Confira se é o relatório de presença exportado pelo Teams (seção "Participantes").',
      )
      return
    }
    onImport(reuniao)
  }

  return (
    <section className="cartao">
      <h2>Importar relatório de presença</h2>
      <p className="subtitulo">
        Arraste aqui o arquivo que o Teams exporta na aba de presença da reunião.
      </p>

      <div
        className={`zona-arquivo${arrastando ? ' arrastando' : ''}`}
        role="button"
        tabIndex={0}
        onClick={() => inputRef.current?.click()}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') inputRef.current?.click()
        }}
        onDragOver={(e) => {
          e.preventDefault()
          setArrastando(true)
        }}
        onDragLeave={() => setArrastando(false)}
        onDrop={(e) => {
          e.preventDefault()
          setArrastando(false)
          const arquivo = e.dataTransfer.files[0]
          if (arquivo) void processar(arquivo)
        }}
      >
        <strong>Solte o arquivo de presença aqui</strong>
        <small>ou clique para escolher (.csv exportado pelo Teams)</small>
        <input
          ref={inputRef}
          type="file"
          accept=".csv,.txt,.tsv"
          hidden
          onChange={(e) => {
            const arquivo = e.target.files?.[0]
            if (arquivo) void processar(arquivo)
            e.target.value = ''
          }}
        />
      </div>

      {erro && <p className="erro">{erro}</p>}

      <div className="como-exportar">
        Como exportar do Teams:
        <ol>
          <li>Abra a reunião no calendário do Teams (depois que ela terminar).</li>
          <li>Vá na aba <strong>Presença</strong> (Attendance).</li>
          <li>Clique em <strong>Baixar</strong> — o organizador da reunião tem esse botão.</li>
        </ol>
        <button
          type="button"
          className="botao link"
          onClick={() => onImport(parseTeamsAttendance(EXEMPLO))}
        >
          Não tem um arquivo agora? Usar reunião de exemplo
        </button>
      </div>
    </section>
  )
}
