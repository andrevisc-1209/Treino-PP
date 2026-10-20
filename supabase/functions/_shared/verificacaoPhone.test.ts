import { describe, expect, it } from 'vitest'
import { chaveDoNumero, codigoValido, estadoDoCodigo, expiraEm, gerarCodigo, hashCodigo, iguais, MAX_TENTATIVAS, mensagemCodigo, telefoneNacional } from './verificacaoPhone.ts'

const agora = new Date('2026-10-20T12:00:00Z')
const linha = (o: Partial<{ expires_at: string; used_at: string | null; attempts: number }> = {}) => ({ expires_at: '2026-10-20T12:10:00Z', used_at: null, attempts: 0, ...o })

describe('telefoneNacional (formato)', () => {
  it('aceita telefone brasileiro com ou sem máscara/55 e devolve DDD + número', () => {
    expect(telefoneNacional('(21) 99999-0000')).toBe('21999990000')
    expect(telefoneNacional('+55 21 99999-0000')).toBe('21999990000')
    expect(telefoneNacional('21 8888-0000')).toBe('2188880000') // celular antigo de 10 dígitos
  })
  it('recusa formato inválido, curto, longo, texto e tipos errados', () => {
    for (const ruim of ['', '123', '999999', '+1 202 555 0100', '(21) 3333-4444', '(21) 83333-4444', '(01) 99999-0000', '(10) 99999-0000', '21 9999-00', 'abc', '5'.repeat(41), null, undefined, 21999990000, {}]) {
      expect(telefoneNacional(ruim)).toBeNull()
    }
  })
})

describe('código', () => {
  it('gera 6 dígitos (inclusive com zeros à esquerda)', () => {
    for (let i = 0; i < 200; i++) expect(gerarCodigo()).toMatch(/^\d{6}$/)
  })
  it('valida o que o usuário digita', () => {
    expect(codigoValido('012345')).toBe(true)
    for (const ruim of ['12345', '1234567', '12 456', 'abcdef', 123456, null, undefined]) expect(codigoValido(ruim)).toBe(false)
  })
  it('hash depende do código e do id da linha; comparação em tempo constante', async () => {
    const a = await hashCodigo('123456', 'linha-1')
    expect(a).toMatch(/^[0-9a-f]{64}$/)
    expect(iguais(a, await hashCodigo('123456', 'linha-1'))).toBe(true)
    expect(iguais(a, await hashCodigo('123457', 'linha-1'))).toBe(false)
    expect(iguais(a, await hashCodigo('123456', 'linha-2'))).toBe(false)
    expect(iguais(a, a.slice(1))).toBe(false)
  })
  it('chave do limite por número não contém o número', async () => {
    const k = await chaveDoNumero('21999990000')
    expect(k).toMatch(/^[0-9a-f]{32}$/)
    expect(k).not.toContain('21999990000')
  })
})

describe('estadoDoCodigo', () => {
  it('happy path: dentro do prazo, não usado, poucas tentativas → válido', () => {
    expect(estadoDoCodigo(linha(), agora)).toBe('valido')
    expect(estadoDoCodigo(linha({ attempts: MAX_TENTATIVAS - 1 }), agora)).toBe('valido')
  })
  it('expirado', () => {
    expect(estadoDoCodigo(linha({ expires_at: '2026-10-20T11:59:59Z' }), agora)).toBe('expirado')
  })
  it('já usado (vale mais que o prazo)', () => {
    expect(estadoDoCodigo(linha({ used_at: '2026-10-20T11:55:00Z' }), agora)).toBe('usado')
    expect(estadoDoCodigo(linha({ used_at: '2026-10-20T11:55:00Z', expires_at: '2026-10-20T11:00:00Z' }), agora)).toBe('usado')
  })
  it('tentativas esgotadas', () => {
    expect(estadoDoCodigo(linha({ attempts: MAX_TENTATIVAS }), agora)).toBe('tentativas')
  })
  it('prazo de 10 minutos', () => {
    expect(expiraEm(agora)).toBe('2026-10-20T12:10:00.000Z')
  })
})

describe('mensagemCodigo', () => {
  it('texto fixo com o código e sem dados do usuário', () => {
    const m = mensagemCodigo('042913')
    expect(m).toContain('*042913*')
    expect(m).toContain('10 minutos')
    expect(m).toContain('ignore')
  })
})
