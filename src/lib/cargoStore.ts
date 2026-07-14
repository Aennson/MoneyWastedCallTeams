import type { CargoIndexEntry } from './cargoSearch'
import type { CargoDataset, CargoInfo } from './salary'

/** Cargo criado/editado pelo usuário; aliases extras alimentam a busca. */
export interface CargoCustom extends CargoInfo {
  aliases?: string[]
}

/**
 * Mescla o dataset seed (CAGED) com as customizações do usuário:
 * - custom com mesmo código sombreia o seed (mantendo os aliases do seed na busca);
 * - custom com código novo é acrescentado;
 * - códigos em `ocultos` somem de tudo (oculto vence custom).
 */
export function mesclarCargos(params: {
  seedDataset: CargoDataset
  seedIndice: CargoIndexEntry[]
  custom: Record<string, CargoCustom>
  ocultos: string[]
}): { dataset: CargoDataset; indice: CargoIndexEntry[] } {
  const { seedDataset, seedIndice, custom, ocultos } = params
  const escondido = new Set(ocultos)

  const dataset: CargoDataset = {}
  for (const [cbo, info] of Object.entries(seedDataset)) {
    if (escondido.has(cbo)) continue
    const sombra = custom[cbo]
    dataset[cbo] = sombra ? paraInfo(sombra) : info
  }
  for (const [cbo, info] of Object.entries(custom)) {
    if (escondido.has(cbo) || cbo in seedDataset) continue
    dataset[cbo] = paraInfo(info)
  }

  const indice: CargoIndexEntry[] = []
  for (const entrada of seedIndice) {
    if (escondido.has(entrada.cbo)) continue
    const sombra = custom[entrada.cbo]
    indice.push(
      sombra
        ? {
            cbo: entrada.cbo,
            titulo: sombra.titulo,
            aliases: [...new Set([...entrada.aliases, ...(sombra.aliases ?? [])])],
          }
        : entrada,
    )
  }
  for (const [cbo, info] of Object.entries(custom)) {
    if (escondido.has(cbo) || cbo in seedDataset) continue
    indice.push({ cbo, titulo: info.titulo, aliases: info.aliases ?? [] })
  }

  return { dataset, indice }
}

function paraInfo(c: CargoCustom): CargoInfo {
  const info: CargoInfo = { titulo: c.titulo, mediaNacional: c.mediaNacional }
  if (c.porUF !== undefined) info.porUF = c.porUF
  return info
}

/** Gera o próximo código de cargo personalizado (P0001, P0002, …). */
export function proximoCodigoCustom(existentes: string[]): string {
  let maior = 0
  for (const codigo of existentes) {
    const m = codigo.match(/^P(\d{4})$/)
    if (m) maior = Math.max(maior, Number(m[1]))
  }
  return `P${String(maior + 1).padStart(4, '0')}`
}
