import { describe, expect, test } from 'vitest'
import { buscarCargos, type CargoIndexEntry } from './cargoSearch'

const indice: CargoIndexEntry[] = [
  { cbo: '317110', titulo: 'Programador de sistemas de informação', aliases: ['desenvolvedor', 'dev', 'programador'] },
  { cbo: '212405', titulo: 'Analista de desenvolvimento de sistemas', aliases: ['analista de sistemas'] },
  { cbo: '252105', titulo: 'Administrador', aliases: ['administrador de empresas'] },
  { cbo: '411005', titulo: 'Auxiliar de escritório', aliases: ['auxiliar administrativo'] },
]

describe('buscarCargos', () => {
  test('encontra por alias exato', () => {
    const r = buscarCargos('dev', indice)
    expect(r[0].cbo).toBe('317110')
  })

  test('ignora acentos e maiúsculas', () => {
    const r = buscarCargos('PROGRAMADOR DE SISTEMAS DE INFORMACAO', indice)
    expect(r[0].cbo).toBe('317110')
  })

  test('encontra por substring do título', () => {
    const r = buscarCargos('escritório', indice)
    expect(r[0].cbo).toBe('411005')
  })

  test('match exato de alias vem antes de substring', () => {
    // "administrador" é substring do alias de 252105 e de "auxiliar administrativo"? não —
    // mas "administrador" bate exato? é prefixo de "administrador de empresas" e título exato "Administrador"
    const r = buscarCargos('administrador', indice)
    expect(r[0].cbo).toBe('252105')
  })

  test('consulta vazia retorna lista vazia', () => {
    expect(buscarCargos('', indice)).toEqual([])
    expect(buscarCargos('   ', indice)).toEqual([])
  })

  test('sem resultados retorna lista vazia', () => {
    expect(buscarCargos('astronauta', indice)).toEqual([])
  })
})
