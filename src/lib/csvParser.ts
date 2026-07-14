export interface ParticipanteImportado {
  nome: string
  email?: string
  segundos: number
  funcao?: string
}

export interface ReuniaoImportada {
  titulo?: string
  duracaoReuniaoSegundos?: number
  participantes: ParticipanteImportado[]
}

/**
 * Converte durações no formato do Teams para segundos.
 * Aceita "1h 2m 10s", "45m", "1 h 1 min 55 s" e "HH:MM:SS".
 */
export function parseDuracao(texto: string): number | null {
  const t = texto.trim()

  const relogio = t.match(/^(\d+):(\d{1,2}):(\d{1,2})$/)
  if (relogio) {
    return Number(relogio[1]) * 3600 + Number(relogio[2]) * 60 + Number(relogio[3])
  }

  let total = 0
  let achou = false
  const h = t.match(/(\d+)\s*h(?:ora)?s?\b/i)
  if (h) {
    total += Number(h[1]) * 3600
    achou = true
  }
  const m = t.match(/(\d+)\s*m(?:in(?:uto)?s?)?\b/i)
  if (m) {
    total += Number(m[1]) * 60
    achou = true
  }
  const s = t.match(/(\d+)\s*s(?:eg(?:undo)?s?)?\b/i)
  if (s) {
    total += Number(s[1])
    achou = true
  }
  return achou ? total : null
}

/** Decodifica o arquivo de presença: o Teams exporta UTF-16 LE com BOM; aceita também UTF-8. */
export function decodeAttendanceFile(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer)
  if (bytes.length >= 2 && bytes[0] === 0xff && bytes[1] === 0xfe) {
    return new TextDecoder('utf-16le').decode(buffer)
  }
  if (bytes.length >= 2 && bytes[0] === 0xfe && bytes[1] === 0xff) {
    return new TextDecoder('utf-16be').decode(buffer)
  }
  // Sem BOM: muitos bytes zero indicam UTF-16 LE mesmo assim
  const amostra = bytes.subarray(0, Math.min(bytes.length, 256))
  const zeros = amostra.filter((b) => b === 0).length
  if (zeros > amostra.length / 4) {
    return new TextDecoder('utf-16le').decode(buffer)
  }
  return new TextDecoder('utf-8').decode(buffer) // TextDecoder já remove o BOM UTF-8
}

const COLUNAS = {
  nome: /^(name|nome)$/i,
  duracao: /(in-meeting duration|dura[çc][ãa]o na reuni[ãa]o|^duration$|^dura[çc][ãa]o$)/i,
  email: /^e-?mail$/i,
  funcao: /^(role|fun[çc][ãa]o)$/i,
}

const RESUMO = {
  titulo: /^(meeting title|t[íi]tulo da reuni[ãa]o)$/i,
  duracao: /^(meeting duration|dura[çc][ãa]o da reuni[ãa]o)$/i,
}

/**
 * Faz o parse do relatório de presença exportado pelo Teams (TSV em seções).
 * Lê o título/duração da seção "1." e os participantes da seção "2.",
 * ignorando a seção "3. In-Meeting Activities".
 */
export function parseTeamsAttendance(conteudo: string): ReuniaoImportada {
  const linhas = conteudo.replace(/\r\n?/g, '\n').split('\n')
  const reuniao: ReuniaoImportada = { participantes: [] }

  let i = 0

  // Seção de resumo: pares "rótulo \t valor" até a seção de participantes
  for (; i < linhas.length; i++) {
    const linha = linhas[i]
    if (/^2\./.test(linha)) break
    const [rotulo, valor] = linha.split('\t')
    if (valor === undefined) continue
    if (RESUMO.titulo.test(rotulo.trim())) reuniao.titulo = valor.trim()
    if (RESUMO.duracao.test(rotulo.trim())) {
      reuniao.duracaoReuniaoSegundos = parseDuracao(valor) ?? undefined
    }
  }

  // Cabeçalho da tabela de participantes
  let idx: { nome: number; duracao: number; email: number; funcao: number } | null = null
  for (i++; i < linhas.length; i++) {
    const celulas = linhas[i].split('\t').map((c) => c.trim())
    const nome = celulas.findIndex((c) => COLUNAS.nome.test(c))
    const duracao = celulas.findIndex((c) => COLUNAS.duracao.test(c))
    if (nome !== -1 && duracao !== -1) {
      idx = {
        nome,
        duracao,
        email: celulas.findIndex((c) => COLUNAS.email.test(c)),
        funcao: celulas.findIndex((c) => COLUNAS.funcao.test(c)),
      }
      break
    }
  }
  if (!idx) return reuniao

  // Linhas de participantes até linha vazia ou seção "3."
  for (i++; i < linhas.length; i++) {
    const linha = linhas[i]
    if (linha.trim() === '' || /^3\./.test(linha)) break
    const celulas = linha.split('\t').map((c) => c.trim())
    const nome = celulas[idx.nome]
    if (!nome) continue
    const segundos = parseDuracao(celulas[idx.duracao] ?? '') ?? 0
    reuniao.participantes.push({
      nome,
      segundos,
      email: idx.email !== -1 ? celulas[idx.email] || undefined : undefined,
      funcao: idx.funcao !== -1 ? celulas[idx.funcao] || undefined : undefined,
    })
  }

  return reuniao
}
