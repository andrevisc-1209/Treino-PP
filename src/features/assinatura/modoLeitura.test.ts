import { describe, expect, it } from 'vitest'
import { calcularAssinatura, emModoLeitura } from './useAssinatura'

const agora = Date.parse('2026-10-23T12:00:00Z')
const linha = (over: Partial<Parameters<typeof calcularAssinatura>[0]['linha']>) => ({
  linha: { status: 'trial' as const, plano: null, trial_fim: '2026-10-30T00:00:00Z', assinatura_fim: null, ...over },
  ativoNoServidor: null,
})

describe('emModoLeitura', () => {
  it('sem dado ainda: não bloqueia (o servidor é quem barra)', () => expect(emModoLeitura(undefined)).toBe(false))
  it('trial em dia: normal', () => expect(emModoLeitura(calcularAssinatura(linha({}), agora))).toBe(false))
  it('trial vencido: modo leitura', () => expect(emModoLeitura(calcularAssinatura(linha({ trial_fim: '2026-10-01T00:00:00Z' }), agora))).toBe(true))
  it('o veredito do servidor manda: inativo no servidor = modo leitura', () => {
    expect(emModoLeitura(calcularAssinatura({ ...linha({}), ativoNoServidor: false }, agora))).toBe(true)
  })
})
