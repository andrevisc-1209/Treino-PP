import { describe, expect, it } from 'vitest'
import { calcularVagas, dataEHoraSP, instanteSP, normalizarTelefone, primeiroNome, slugValido, somarDiasISO, vagaDisponivel, validarPedido } from './agendaPublica'

describe('horário de São Paulo', () => {
  it('data e hora de um instante e o caminho de volta', () => {
    expect(dataEHoraSP('2026-10-30T02:30:00Z')).toEqual({ data: '2026-10-29', hora: '23:30' })
    expect(dataEHoraSP(instanteSP('2026-10-30', '07:00'))).toEqual({ data: '2026-10-30', hora: '07:00' })
    expect(somarDiasISO('2026-10-31', 1)).toBe('2026-11-01')
    expect(somarDiasISO('2026-12-31', 1)).toBe('2027-01-01')
  })
})

describe('slug', () => {
  it('só letras minúsculas, números e hífens entre eles', () => {
    expect(slugValido('andre-scherer-4f2k')).toBe(true)
    for (const ruim of ['', 'ab', 'André', 'a b c', '-abc', 'abc-', 'a--b', 'a/b', "x'--", 'a'.repeat(61), 12, null]) expect(slugValido(ruim)).toBe(false)
  })
})

describe('telefone', () => {
  it('normaliza para 55 + DDD + número e recusa o que não é telefone', () => {
    expect(normalizarTelefone('(21) 99999-0000')).toBe('5521999990000')
    expect(normalizarTelefone('+55 21 99999-0000')).toBe('5521999990000')
    expect(normalizarTelefone('2133334444')).toBe('552133334444')
    for (const ruim of ['', '123', '(21) 89999-0000', '11111111111', '4421999990000', 5521999990000, null, undefined]) expect(normalizarTelefone(ruim as unknown)).toBeNull()
  })
})

describe('validação do pedido', () => {
  const ok = { nome: '  Maria   Souza ', telefone: '(21) 99999-0000', mensagem: ' Quero experimentar ', consentimento: true, data: '2026-10-30', hora: '07:00' }
  it('limpa os textos e devolve o pedido', () => {
    expect(validarPedido(ok)).toEqual({ ok: true, pedido: { nome: 'Maria Souza', telefone: '5521999990000', mensagem: 'Quero experimentar', dataISO: '2026-10-30', hora: '07:00' } })
    expect(validarPedido({ ...ok, mensagem: '' })).toMatchObject({ ok: true, pedido: { mensagem: null } })
    expect(validarPedido({ ...ok, nome: 'Ana\u0000\nLima' })).toMatchObject({ pedido: { nome: 'Ana Lima' } })
  })
  it('recusa nome, telefone, mensagem, consentimento e horário inválidos', () => {
    expect(validarPedido({ ...ok, nome: 'A' })).toMatchObject({ ok: false })
    expect(validarPedido({ ...ok, nome: 'x'.repeat(81) })).toMatchObject({ ok: false })
    expect(validarPedido({ ...ok, telefone: '12' })).toMatchObject({ ok: false })
    expect(validarPedido({ ...ok, mensagem: 'x'.repeat(141) })).toMatchObject({ ok: false })
    expect(validarPedido({ ...ok, consentimento: false })).toMatchObject({ ok: false })
    expect(validarPedido({ ...ok, consentimento: 'true' })).toMatchObject({ ok: false })
    expect(validarPedido({ ...ok, data: '30/10/2026' })).toMatchObject({ ok: false })
    expect(validarPedido({ ...ok, hora: '25:00' })).toMatchObject({ ok: false })
    expect(validarPedido({})).toMatchObject({ ok: false })
  })
  it('primeiro nome', () => {
    expect(primeiroNome(' André Scherer ')).toBe('André')
    expect(primeiroNome(null)).toBe('')
  })
})

describe('vagas (mesmo cálculo da agenda do personal)', () => {
  const base = {
    janelas: [{ weekday: 5, start_time: '07:00:00', end_time: '10:00:00' }],
    aulas: [] as { starts_at: string; duration_min: number; status: string }[],
    bloqueios: [] as { data_inicio: string; data_fim: string }[],
    parametros: { duracaoMin: 60, intervaloMin: 0, antecedenciaHoras: 3, horizonteSemanas: 4 },
    agora: new Date('2026-10-29T12:00:00Z'),
    de: '2026-10-30',
    ate: '2026-10-30',
  }
  it('fatia, tira aula marcada, respeita bloqueio e antecedência', () => {
    expect(calcularVagas(base).map((v) => v.inicio)).toEqual(['07:00', '08:00', '09:00'])
    expect(calcularVagas({ ...base, aulas: [{ starts_at: '2026-10-30T08:00:00-03:00', duration_min: 60, status: 'agendada' }] }).map((v) => v.inicio)).toEqual(['07:00', '09:00'])
    expect(calcularVagas({ ...base, bloqueios: [{ data_inicio: '2026-10-30', data_fim: '2026-10-30' }] })).toEqual([])
    expect(calcularVagas({ ...base, agora: new Date('2026-10-30T08:30:00-03:00'), antecedenciaHoras: 3 })).toEqual([])
  })
  it('acha a vaga pedida', () => {
    const v = calcularVagas(base)
    expect(vagaDisponivel(v, '2026-10-30', '08:00')).toEqual({ dataISO: '2026-10-30', inicio: '08:00', fim: '09:00' })
    expect(vagaDisponivel(v, '2026-10-30', '08:30')).toBeNull()
  })
})
