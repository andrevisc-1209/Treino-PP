import { describe, expect, it } from 'vitest'
import { condicao, dicaTreino, escolherLocal } from './clima.ts'

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
  it('dica por prioridade: chuva > calor > UV > vento > ok', () => {
    const ok = { temp: 24, sensacao: 25, vento: 10, chuvaProb: 10, uv: 5 }
    expect(dicaTreino(ok)).toMatch(/Boas condições/)
    expect(dicaTreino({ ...ok, chuvaProb: 70, temp: 35 })).toMatch(/Chuva/)
    expect(dicaTreino({ ...ok, sensacao: 36 })).toMatch(/Calor/)
    expect(dicaTreino({ ...ok, uv: 9 })).toMatch(/UV/)
    expect(dicaTreino({ ...ok, vento: 40 })).toMatch(/Vento/)
  })
})
