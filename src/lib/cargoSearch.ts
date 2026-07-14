export interface CargoIndexEntry {
  cbo: string
  titulo: string
  aliases: string[]
}

function normalizar(texto: string): string {
  return texto
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .trim()
}

/** Busca cargos por título ou alias, sem acentos/caixa, ordenando match exato > prefixo > substring. */
export function buscarCargos(consulta: string, indice: CargoIndexEntry[]): CargoIndexEntry[] {
  const q = normalizar(consulta)
  if (q === '') return []

  const pontuados: { entrada: CargoIndexEntry; pontos: number }[] = []
  for (const entrada of indice) {
    const termos = [entrada.titulo, ...entrada.aliases].map(normalizar)
    let pontos = 0
    for (const termo of termos) {
      if (termo === q) pontos = Math.max(pontos, 3)
      else if (termo.startsWith(q)) pontos = Math.max(pontos, 2)
      else if (termo.includes(q)) pontos = Math.max(pontos, 1)
    }
    if (pontos > 0) pontuados.push({ entrada, pontos })
  }

  return pontuados.sort((a, b) => b.pontos - a.pontos).map((p) => p.entrada)
}
