import { describe, expect, test } from 'vitest'
import { mesclarCargos, proximoCodigoCustom, type CargoCustom } from './cargoStore'
import type { CargoIndexEntry } from './cargoSearch'
import type { CargoDataset } from './salary'

const seedDataset: CargoDataset = {
  '317110': { titulo: 'Programador de sistemas de informação', mediaNacional: 5500, porUF: { SP: 6600 } },
  '252105': { titulo: 'Administrador', mediaNacional: 5200 },
}

const seedIndice: CargoIndexEntry[] = [
  { cbo: '317110', titulo: 'Programador de sistemas de informação', aliases: ['dev'] },
  { cbo: '252105', titulo: 'Administrador', aliases: [] },
]

describe('mesclarCargos', () => {
  test('sem customizações devolve o seed intacto', () => {
    const r = mesclarCargos({ seedDataset, seedIndice, custom: {}, ocultos: [] })
    expect(r.dataset).toEqual(seedDataset)
    expect(r.indice).toEqual(seedIndice)
  })

  test('cargo custom com mesmo CBO sombreia o seed no dataset e no índice', () => {
    const custom: Record<string, CargoCustom> = {
      '317110': { titulo: 'Dev Sênior', mediaNacional: 12000 },
    }
    const r = mesclarCargos({ seedDataset, seedIndice, custom, ocultos: [] })
    expect(r.dataset['317110']).toEqual({ titulo: 'Dev Sênior', mediaNacional: 12000 })
    const entrada = r.indice.find((e) => e.cbo === '317110')!
    expect(entrada.titulo).toBe('Dev Sênior')
    // aliases do seed são preservados para a busca continuar funcionando
    expect(entrada.aliases).toContain('dev')
  })

  test('cargo custom novo entra no dataset e no índice com seus aliases', () => {
    const custom: Record<string, CargoCustom> = {
      P0001: { titulo: 'Scrum Master', mediaNacional: 9000, aliases: ['agilista'] },
    }
    const r = mesclarCargos({ seedDataset, seedIndice, custom, ocultos: [] })
    expect(r.dataset['P0001']).toEqual({ titulo: 'Scrum Master', mediaNacional: 9000 })
    expect(r.indice.find((e) => e.cbo === 'P0001')).toEqual({
      cbo: 'P0001',
      titulo: 'Scrum Master',
      aliases: ['agilista'],
    })
  })

  test('aliases custom somam aos do seed sem duplicar', () => {
    const custom: Record<string, CargoCustom> = {
      '317110': { titulo: 'Programador', mediaNacional: 6000, aliases: ['dev', 'coder'] },
    }
    const r = mesclarCargos({ seedDataset, seedIndice, custom, ocultos: [] })
    const entrada = r.indice.find((e) => e.cbo === '317110')!
    expect(entrada.aliases.sort()).toEqual(['coder', 'dev'])
  })

  test('cargo oculto some do dataset e do índice', () => {
    const r = mesclarCargos({ seedDataset, seedIndice, custom: {}, ocultos: ['252105'] })
    expect(r.dataset['252105']).toBeUndefined()
    expect(r.indice.find((e) => e.cbo === '252105')).toBeUndefined()
    expect(r.dataset['317110']).toBeDefined()
  })

  test('oculto vence custom', () => {
    const custom: Record<string, CargoCustom> = {
      '252105': { titulo: 'Admin', mediaNacional: 7000 },
    }
    const r = mesclarCargos({ seedDataset, seedIndice, custom, ocultos: ['252105'] })
    expect(r.dataset['252105']).toBeUndefined()
  })

  test('porUF do custom substitui o do seed quando informado', () => {
    const custom: Record<string, CargoCustom> = {
      '317110': { titulo: 'Programador', mediaNacional: 6000, porUF: { RJ: 7000 } },
    }
    const r = mesclarCargos({ seedDataset, seedIndice, custom, ocultos: [] })
    expect(r.dataset['317110'].porUF).toEqual({ RJ: 7000 })
  })
})

describe('proximoCodigoCustom', () => {
  test('primeiro código é P0001', () => {
    expect(proximoCodigoCustom([])).toBe('P0001')
  })

  test('incrementa a partir do maior existente', () => {
    expect(proximoCodigoCustom(['P0001', 'P0007', '317110'])).toBe('P0008')
  })

  test('ignora códigos que não seguem o padrão', () => {
    expect(proximoCodigoCustom(['317110', 'X9'])).toBe('P0001')
  })
})
