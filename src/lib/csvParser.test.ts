import { describe, expect, test } from 'vitest'
import { decodeAttendanceFile, parseDuracao, parseTeamsAttendance } from './csvParser'

const amostraEN = [
  '1. Summary',
  'Meeting title\tWeekly Sync',
  'Attended participants\t3',
  'Start time\t2/7/26, 10:00:00 AM',
  'End time\t2/7/26, 11:02:10 AM',
  'Meeting duration\t1h 2m 10s',
  'Average attendance time\t55m 13s',
  '',
  '2. Participants',
  'Name\tFirst Join\tLast Leave\tIn-Meeting Duration\tEmail\tParticipant ID (UPN)\tRole',
  'Ana Silva\t2/7/26, 10:00:05 AM\t2/7/26, 11:02:00 AM\t1h 1m 55s\tana@empresa.com\tana@empresa.com\tOrganizer',
  'Bruno Costa\t2/7/26, 10:05:00 AM\t2/7/26, 11:00:00 AM\t55m\tbruno@empresa.com\tbruno@empresa.com\tPresenter',
  'Carla Dias\t2/7/26, 10:30:00 AM\t2/7/26, 11:02:10 AM\t32m 10s\tcarla@empresa.com\tcarla@empresa.com\tAttendee',
  '',
  '3. In-Meeting Activities',
  'Name\tJoin Time\tLeave Time\tDuration\tEmail\tRole',
  'Ana Silva\t2/7/26, 10:00:05 AM\t11:02:00 AM\t1h 1m 55s\tana@empresa.com\tOrganizer',
].join('\r\n')

const amostraPT = [
  '1. Resumo',
  'Título da reunião\tAlinhamento Semanal',
  'Participantes presentes\t2',
  'Hora de início\t07/02/26, 10:00:00',
  'Hora de término\t07/02/26, 11:00:00',
  'Duração da reunião\t1h',
  '',
  '2. Participantes',
  'Nome\tPrimeiro ingresso\tÚltima saída\tDuração na reunião\tEmail\tID do participante (UPN)\tFunção',
  'Davi Rocha\t07/02/26, 10:00:00\t07/02/26, 11:00:00\t1h\tdavi@empresa.com\tdavi@empresa.com\tOrganizador',
  'Elisa Melo\t07/02/26, 10:10:00\t07/02/26, 10:55:00\t45m\telisa@empresa.com\telisa@empresa.com\tParticipante',
].join('\r\n')

describe('parseDuracao', () => {
  test('horas, minutos e segundos', () => {
    expect(parseDuracao('1h 2m 10s')).toBe(3730)
  })
  test('só minutos', () => {
    expect(parseDuracao('45m')).toBe(2700)
  })
  test('só segundos', () => {
    expect(parseDuracao('30s')).toBe(30)
  })
  test('com espaços entre número e unidade (variação de idioma)', () => {
    expect(parseDuracao('1 h 1 min 55 s')).toBe(3715)
  })
  test('formato HH:MM:SS', () => {
    expect(parseDuracao('01:02:10')).toBe(3730)
  })
  test('texto irreconhecível retorna null', () => {
    expect(parseDuracao('n/a')).toBeNull()
  })
})

describe('parseTeamsAttendance — export EN', () => {
  const reuniao = parseTeamsAttendance(amostraEN)

  test('extrai o título da reunião', () => {
    expect(reuniao.titulo).toBe('Weekly Sync')
  })

  test('extrai os 3 participantes da seção 2 (ignora seção de atividades)', () => {
    expect(reuniao.participantes).toHaveLength(3)
    expect(reuniao.participantes.map((p) => p.nome)).toEqual([
      'Ana Silva',
      'Bruno Costa',
      'Carla Dias',
    ])
  })

  test('converte a duração individual para segundos', () => {
    expect(reuniao.participantes[0].segundos).toBe(3715) // 1h 1m 55s
    expect(reuniao.participantes[1].segundos).toBe(3300) // 55m
    expect(reuniao.participantes[2].segundos).toBe(1930) // 32m 10s
  })

  test('captura email e função', () => {
    expect(reuniao.participantes[0].email).toBe('ana@empresa.com')
    expect(reuniao.participantes[0].funcao).toBe('Organizer')
  })

  test('captura a duração total da reunião', () => {
    expect(reuniao.duracaoReuniaoSegundos).toBe(3730)
  })
})

describe('parseTeamsAttendance — export PT-BR', () => {
  const reuniao = parseTeamsAttendance(amostraPT)

  test('extrai título e participantes com cabeçalhos em português', () => {
    expect(reuniao.titulo).toBe('Alinhamento Semanal')
    expect(reuniao.participantes).toHaveLength(2)
  })

  test('converte durações', () => {
    expect(reuniao.participantes[0].segundos).toBe(3600)
    expect(reuniao.participantes[1].segundos).toBe(2700)
  })
})

describe('decodeAttendanceFile', () => {
  test('decodifica UTF-16 LE com BOM (formato padrão do Teams)', () => {
    const texto = 'Nome\tDuração'
    const buf = new Uint8Array(2 + texto.length * 2)
    buf[0] = 0xff
    buf[1] = 0xfe
    for (let i = 0; i < texto.length; i++) {
      const code = texto.charCodeAt(i)
      buf[2 + i * 2] = code & 0xff
      buf[3 + i * 2] = code >> 8
    }
    expect(decodeAttendanceFile(buf.buffer)).toBe(texto)
  })

  test('decodifica UTF-8 comum', () => {
    const bytes = new TextEncoder().encode('Nome\tDuração')
    expect(decodeAttendanceFile(bytes.buffer as ArrayBuffer)).toBe('Nome\tDuração')
  })

  test('remove BOM de UTF-8', () => {
    const bytes = new TextEncoder().encode('﻿Nome')
    expect(decodeAttendanceFile(bytes.buffer as ArrayBuffer)).toBe('Nome')
  })
})
