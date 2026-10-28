import { describe, expect, it } from 'vitest'
import { validarCobranca } from './cobrancaValidacao'
import type { CobrancaFormValor } from './CobrancaForm'

const ok: CobrancaFormValor = {
  modelo: 'por_aula',
  valorTexto: '100',
  diaCicloTexto: '22',
  diasVencimentoTexto: '5',
  cobrarDistancia: false,
  valorDistanciaTexto: '',
  qtdPacoteTexto: '',
  validadePacoteTexto: '60',
  feitasPacoteTexto: '',
}

describe('validarCobranca (limites do banco: dia 1–28, vencimento 0–30)', () => {
  it('valores válidos passam; vencimento vazio vale 0', () => {
    expect(validarCobranca(ok)).toBeNull()
    expect(validarCobranca({ ...ok, diasVencimentoTexto: '' })).toBeNull()
    expect(validarCobranca({ ...ok, diaCicloTexto: '28', diasVencimentoTexto: '30' })).toBeNull()
    expect(validarCobranca({ ...ok, diaCicloTexto: '1', diasVencimentoTexto: '0' })).toBeNull()
  })
  it('valor zerado, vazio ou inválido', () => {
    for (const valorTexto of ['', '0', '-5', 'abc']) expect(validarCobranca({ ...ok, valorTexto })).toMatch(/valor maior que zero/i)
    expect(validarCobranca({ ...ok, valorTexto: '99,90' })).toBeNull()
  })
  it('dia do ciclo fora de 1–28 (era o que estourava o CHECK do banco)', () => {
    for (const diaCicloTexto of ['', '0', '29', '30', '31', '1.5', 'x']) expect(validarCobranca({ ...ok, diaCicloTexto })).toMatch(/entre 1 e 28/)
  })
  it('vencimento fora de 0–30', () => {
    for (const diasVencimentoTexto of ['31', '45', '-1', '2.5', 'x']) expect(validarCobranca({ ...ok, diasVencimentoTexto })).toMatch(/0 a 30/)
  })
  it('treino à distância ligado exige valor', () => {
    expect(validarCobranca({ ...ok, cobrarDistancia: true, valorDistanciaTexto: '' })).toMatch(/à distância/i)
    expect(validarCobranca({ ...ok, cobrarDistancia: true, valorDistanciaTexto: '80' })).toBeNull()
  })
})

describe('validarCobranca — pacote de aulas', () => {
  const pacote: CobrancaFormValor = { ...ok, modelo: 'pacote', valorTexto: '800', qtdPacoteTexto: '10', diaCicloTexto: '', diasVencimentoTexto: '' }
  it('não exige ciclo nem vencimento', () => {
    expect(validarCobranca(pacote)).toBeNull()
  })
  it('exige valor, quantidade e prazo válidos', () => {
    expect(validarCobranca({ ...pacote, valorTexto: '' })).toMatch(/valor/i)
    expect(validarCobranca({ ...pacote, qtdPacoteTexto: '' })).toMatch(/Quantidade/)
    expect(validarCobranca({ ...pacote, validadePacoteTexto: '0' })).toMatch(/Prazo/)
  })
  it('na edição, não aceita menos aulas feitas do que o app já registrou', () => {
    expect(validarCobranca({ ...pacote, feitasPacoteTexto: '1' }, 3)).toMatch(/já registrou/)
    expect(validarCobranca({ ...pacote, feitasPacoteTexto: '3' }, 3)).toBeNull()
  })
})
