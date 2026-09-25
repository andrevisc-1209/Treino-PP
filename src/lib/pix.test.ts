import { describe, expect, it } from 'vitest'
import { crc16, gerarPayloadPix, normalizarCidadePix, normalizarChavePix, normalizarNomePix } from './pix'

describe('crc16', () => {
  it('calcula o valor de referência de "123456789"', () => {
    expect(crc16('123456789')).toBe('29B1')
  })
})

describe('normalizarChavePix', () => {
  it('cpf/cnpj: só dígitos', () => {
    expect(normalizarChavePix('cpf', '123.456.789-00')).toBe('12345678900')
    expect(normalizarChavePix('cnpj', '12.345.678/0001-90')).toBe('12345678000190')
  })

  it('telefone: +55DDDNÚMERO', () => {
    expect(normalizarChavePix('telefone', '(21) 98888-7777')).toBe('+5521988887777')
    expect(normalizarChavePix('telefone', '+55 21 98888-7777')).toBe('+5521988887777')
  })

  it('email: minúsculas', () => {
    expect(normalizarChavePix('email', 'Professor@Exemplo.COM')).toBe('professor@exemplo.com')
  })

  it('aleatória: mantém como veio (só apara espaços)', () => {
    expect(normalizarChavePix('aleatoria', ' 123e4567-e89b-12d3-a456-426614174000 ')).toBe(
      '123e4567-e89b-12d3-a456-426614174000',
    )
  })
})

describe('normalizarNomePix / normalizarCidadePix', () => {
  it('remove acento, deixa maiúsculo e corta em 25/15 caracteres', () => {
    expect(normalizarNomePix('José da Silva Conceição Personal')).toBe('JOSE DA SILVA CONCEICAO P')
    expect(normalizarNomePix('José da Silva Conceição Personal')).toHaveLength(25)
    expect(normalizarCidadePix('São Gonçalo')).toBe('SAO GONCALO')
    expect(normalizarCidadePix('Rio de Janeiro')).toBe('RIO DE JANEIRO')
    expect(normalizarCidadePix('Rio de Janeiro')).toHaveLength(14)
  })
})

describe('gerarPayloadPix', () => {
  it('monta os campos EMV com os tamanhos corretos e termina com CRC de 4 hex', () => {
    const payload = gerarPayloadPix({
      chave: '12345678900',
      nome: 'JOAO DA SILVA',
      cidade: 'SAO PAULO',
      valor: 50,
    })

    expect(payload.startsWith('000201')).toBe(true)
    expect(payload).toContain('br.gov.bcb.pix')
    expect(payload).toContain('540550.00')
    expect(payload).toContain('5913JOAO DA SILVA')
    expect(payload).toContain('6009SAO PAULO')
    expect(payload).toContain('0503***')
    expect(payload.endsWith('6304')).toBe(false)
    expect(payload.slice(-4)).toMatch(/^[0-9A-F]{4}$/)
  })

  it('formata o valor sempre com 2 casas decimais', () => {
    const payload = gerarPayloadPix({ chave: 'x', nome: 'A', cidade: 'B', valor: 12.5 })
    expect(payload).toContain('540512.50')
  })

  it('usa um txid customizado quando informado', () => {
    const payload = gerarPayloadPix({ chave: 'x', nome: 'A', cidade: 'B', valor: 1, txid: 'FAT123' })
    expect(payload).toContain('0506FAT123')
  })
})
