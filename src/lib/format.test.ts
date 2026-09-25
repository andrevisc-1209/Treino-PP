import { describe, expect, it } from 'vitest'
import { formatarDataBR, formatarNumero, formatarPesoKg, formatarSexo } from './format'

describe('formatarDataBR', () => {
  it('converte YYYY-MM-DD para dd/mm/aaaa', () => {
    expect(formatarDataBR('2026-09-25')).toBe('25/09/2026')
  })
  it('aceita prefixo de timestamp', () => {
    expect(formatarDataBR('2026-09-25T10:00:00Z')).toBe('25/09/2026')
  })
  it('retorna travessão para vazio', () => {
    expect(formatarDataBR(null)).toBe('—')
    expect(formatarDataBR(undefined)).toBe('—')
    expect(formatarDataBR('')).toBe('—')
  })
})

describe('formatarSexo', () => {
  it('traduz os códigos por extenso', () => {
    expect(formatarSexo('M')).toBe('Masculino')
    expect(formatarSexo('F')).toBe('Feminino')
    expect(formatarSexo('outro')).toBe('Outro')
    expect(formatarSexo(null)).toBe('—')
  })
})

describe('formatarNumero', () => {
  it('usa vírgula decimal', () => {
    expect(formatarNumero(68.5)).toBe('68,5')
    expect(formatarNumero(22)).toBe('22')
  })
  it('retorna travessão para nulo', () => {
    expect(formatarNumero(null)).toBe('—')
  })
})

describe('formatarPesoKg', () => {
  it('formata com vírgula e sufixo kg', () => {
    expect(formatarPesoKg(68.5)).toBe('68,5 kg')
  })
})
