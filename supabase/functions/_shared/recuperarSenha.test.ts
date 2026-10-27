import { describe, expect, it } from 'vitest'
import { lerPedidoRecuperacao, LIMITE_RECUPERACAO_CPF } from './recuperarSenha'

const CPF = '52998224725'

describe('lerPedidoRecuperacao', () => {
  it('aceita CPF com ou sem máscara e token opcional', () => {
    expect(lerPedidoRecuperacao({ cpf: '529.982.247-25', captchaToken: 'tok' })).toEqual({ cpf: CPF, captchaToken: 'tok' })
    expect(lerPedidoRecuperacao({ cpf: CPF })).toEqual({ cpf: CPF, captchaToken: undefined })
  })
  it.each([
    ['corpo nulo', null],
    ['corpo não objeto', 'x'],
    ['CPF com dígito errado', { cpf: '52998224726' }],
    ['CPF ausente', {}],
    ['token que não é texto', { cpf: CPF, captchaToken: 123 }],
    ['token gigante', { cpf: CPF, captchaToken: 'a'.repeat(5000) }],
  ])('rejeita %s', (_nome, corpo) => expect(lerPedidoRecuperacao(corpo)).toBeNull())
  it('limite por CPF é baixo (anti-spam de e-mail)', () => expect(LIMITE_RECUPERACAO_CPF.max).toBeLessThanOrEqual(5))
})
