import { describe, expect, test } from 'vitest'
import { overridesDaSessao, sincronizarRoster, type PessoaVivo } from './rosterSync'

const mapeamentos = {
  'Ana Silva': { cbo: '317110', uf: 'SP' },
}

function pessoa(parcial: Partial<PessoaVivo> & { nome: string }): PessoaVivo {
  return { presente: true, segundos: 0, origem: 'teams', ...parcial }
}

describe('sincronizarRoster', () => {
  test('adiciona nome novo do roster com cargo/UF do mapeamento salvo', () => {
    const r = sincronizarRoster([], ['Ana Silva'], mapeamentos)
    expect(r).toEqual([
      { nome: 'Ana Silva', cbo: '317110', uf: 'SP', presente: true, segundos: 0, origem: 'teams' },
    ])
  })

  test('nome novo sem mapeamento entra sem cargo/UF', () => {
    const r = sincronizarRoster([], ['Zé Novo'], mapeamentos)
    expect(r).toEqual([
      { nome: 'Zé Novo', cbo: undefined, uf: undefined, presente: true, segundos: 0, origem: 'teams' },
    ])
  })

  test('quem sumiu do roster fica ausente mas mantém o tempo', () => {
    const atual = [pessoa({ nome: 'Ana Silva', segundos: 120 })]
    const r = sincronizarRoster(atual, [], mapeamentos)
    expect(r).toEqual([pessoa({ nome: 'Ana Silva', segundos: 120, presente: false })])
  })

  test('quem voltou ao roster fica presente de novo', () => {
    const atual = [pessoa({ nome: 'Ana Silva', segundos: 120, presente: false })]
    const r = sincronizarRoster(atual, ['Ana Silva'], mapeamentos)
    expect(r[0].presente).toBe(true)
    expect(r[0].segundos).toBe(120)
  })

  test('pessoa adicionada manualmente não é tocada pelo sync', () => {
    const atual = [pessoa({ nome: 'Convidado Manual', origem: 'manual', segundos: 50 })]
    const r = sincronizarRoster(atual, [], mapeamentos)
    expect(r).toEqual(atual)
  })

  test('nome do roster igual ao de uma pessoa manual não duplica', () => {
    const atual = [pessoa({ nome: 'Convidado Manual', origem: 'manual' })]
    const r = sincronizarRoster(atual, ['Convidado Manual'], mapeamentos)
    expect(r).toHaveLength(1)
    expect(r[0].origem).toBe('manual')
  })

  test('normaliza espaços no matching de nomes', () => {
    const atual = [pessoa({ nome: 'Ana Silva', segundos: 30 })]
    const r = sincronizarRoster(atual, ['  Ana   Silva '], mapeamentos)
    expect(r).toHaveLength(1)
    expect(r[0].presente).toBe(true)
  })

  test('não altera cargo/UF já definidos de quem continua na sala', () => {
    const atual = [pessoa({ nome: 'Ana Silva', cbo: '999999', uf: 'RJ', segundos: 10 })]
    const r = sincronizarRoster(atual, ['Ana Silva'], mapeamentos)
    expect(r[0].cbo).toBe('999999')
    expect(r[0].uf).toBe('RJ')
  })

  test('preserva o salário de sessão de quem sai e volta', () => {
    const atual = [pessoa({ nome: 'Ana Silva', salarioSessao: 15000, segundos: 60 })]
    const saiu = sincronizarRoster(atual, [], mapeamentos)
    const voltou = sincronizarRoster(saiu, ['Ana Silva'], mapeamentos)
    expect(voltou[0].salarioSessao).toBe(15000)
  })
})

describe('overridesDaSessao', () => {
  test('salário de sessão vence o override persistido da mesma pessoa', () => {
    const pessoas = [pessoa({ nome: 'Ana Silva', salarioSessao: 15000 })]
    const r = overridesDaSessao(pessoas, { 'Ana Silva': 8000, 'Bruno Costa': 6000 })
    expect(r['Ana Silva']).toBe(15000)
    expect(r['Bruno Costa']).toBe(6000)
  })

  test('sem salário de sessão devolve só a base', () => {
    const pessoas = [pessoa({ nome: 'Ana Silva' })]
    const r = overridesDaSessao(pessoas, { 'Bruno Costa': 6000 })
    expect(r).toEqual({ 'Bruno Costa': 6000 })
  })

  test('não muta a base persistida', () => {
    const base = { 'Bruno Costa': 6000 }
    overridesDaSessao([pessoa({ nome: 'Ana Silva', salarioSessao: 9000 })], base)
    expect(base).toEqual({ 'Bruno Costa': 6000 })
  })
})
