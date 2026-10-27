import { describe, expect, it } from 'vitest'
import { condicao, dicaTreino, escolherLocal, rotuloChuvaMm } from './clima.ts'

describe('escolherLocal', () => {
  const r = [
    { name: 'Niterói', latitude: -1, longitude: -1, admin1: 'Bahia', country_code: 'BR' },
    { name: 'Niterói', latitude: -22.88, longitude: -43.1, admin1: 'Rio de Janeiro', country_code: 'BR' },
    { name: 'Niterói', latitude: 9, longitude: 9, admin1: 'Rio de Janeiro', country_code: 'PT' },
  ]
  it('escolhe o do estado (UF) informado, ignorando acentos e outros países', () => {
    expect(escolherLocal(r, 'RJ')?.latitude).toBe(-22.88)
    expect(escolherLocal(r, 'rj')?.latitude).toBe(-22.88)
  })
  it('sem correspondência de estado, cai no primeiro do Brasil; sem resultado, null', () => {
    expect(escolherLocal(r, 'SP')?.latitude).toBe(-1)
    expect(escolherLocal([], 'RJ')).toBeNull()
    expect(escolherLocal(undefined, 'RJ')).toBeNull()
  })
})

describe('condição e dica', () => {
  it('códigos WMO', () => {
    expect(condicao(0).emoji).toBe('☀️')
    expect(condicao(3).texto).toBe('Nublado')
    expect(condicao(63).texto).toBe('Chuva')
    expect(condicao(95).texto).toBe('Tempestade')
  })
  it('frases em tom de colega, cada faixa no seu limite', () => {
    const bom = { temp: 24, sensacao: 25, vento: 10, chuvaProb: 10, uv: 5 }
    expect(dicaTreino(bom)).toBe('Dia perfeito pra treino ao ar livre!')
    expect(dicaTreino({ ...bom, chuvaProb: 70 })).toBe('Vai chover. Melhor treino indoor hoje')
    expect(dicaTreino({ ...bom, chuvaProb: 69 })).toBe('Chance de chuva — vale ter um plano B')
    expect(dicaTreino({ ...bom, chuvaProb: 40 })).toBe('Chance de chuva — vale ter um plano B')
    expect(dicaTreino({ ...bom, chuvaProb: 39 })).toBe('Condições ok pra treinar hoje') // 20–39%: nem perfeito nem chuvoso
    expect(dicaTreino({ ...bom, temp: 35 })).toBe('Calor pesado — hidrata bem os alunos')
    expect(dicaTreino({ ...bom, sensacao: 35 })).toBe('Calor pesado — hidrata bem os alunos')
    expect(dicaTreino({ ...bom, uv: 8 })).toBe('UV alto hoje — melhor treinar cedo ou depois das 16h')
    expect(dicaTreino({ ...bom, vento: 35 })).toBe('Vento forte hoje — cuidado com atividades ao ar livre')
  })
  it('prioridade: chuva > calor > UV > vento > dia bom > neutro', () => {
    const tudo = { temp: 36, sensacao: 38, vento: 40, chuvaProb: 80, uv: 9 }
    expect(dicaTreino(tudo)).toMatch(/chover/)
    expect(dicaTreino({ ...tudo, chuvaProb: 0 })).toMatch(/Calor/)
    expect(dicaTreino({ ...tudo, chuvaProb: 0, temp: 30, sensacao: 30 })).toMatch(/UV/)
    expect(dicaTreino({ ...tudo, chuvaProb: 0, temp: 30, sensacao: 30, uv: 3 })).toMatch(/Vento/)
  })
  it('sem "evite" nem faixa de horário formatada', () => {
    const todas = [
      { temp: 24, sensacao: 25, vento: 10, chuvaProb: 10, uv: 5 },
      { temp: 10, sensacao: 9, vento: 5, chuvaProb: 25, uv: 2 },
      { temp: 24, sensacao: 25, vento: 10, chuvaProb: 80, uv: 5 },
      { temp: 24, sensacao: 25, vento: 10, chuvaProb: 45, uv: 5 },
      { temp: 36, sensacao: 38, vento: 10, chuvaProb: 0, uv: 5 },
      { temp: 24, sensacao: 25, vento: 10, chuvaProb: 0, uv: 9 },
      { temp: 24, sensacao: 25, vento: 40, chuvaProb: 0, uv: 5 },
    ].map(dicaTreino)
    for (const f of todas) expect(f).not.toMatch(/evite|\d{1,2}h\s*(e|às|-)\s*\d{1,2}h/i)
  })
})

describe('rotuloChuvaMm', () => {
  it('só aparece com chuva relevante, em português', () => {
    expect(rotuloChuvaMm(undefined)).toBeNull()
    expect(rotuloChuvaMm(0)).toBeNull()
    expect(rotuloChuvaMm(0.4)).toBe('menos de 1 mm')
    expect(rotuloChuvaMm(3.6)).toBe('cerca de 3,6 mm')
    expect(rotuloChuvaMm(12.4)).toBe('cerca de 12 mm')
  })
})
