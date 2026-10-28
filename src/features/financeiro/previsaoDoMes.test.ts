import { describe, expect, it } from 'vitest'
import { previsaoDoMes, ultimoDiaDoMes, type CobrancaParaPrevisao } from './previsaoDoMes'

const porAula = (aluno_id: string, valor_aula: number): CobrancaParaPrevisao => ({ aluno_id, modelo: 'por_aula', valor_aula, valor_mensal: null, dia_ciclo: 15, ativo: true })
const mensal = (aluno_id: string, valor_mensal: number, dia_ciclo = 1): CobrancaParaPrevisao => ({ aluno_id, modelo: 'mensal', valor_aula: null, valor_mensal, dia_ciclo, ativo: true })
const base = { hojeISO: '2026-10-28', faturas: [], cobrancas: [], participacoesAbertas: [], aulasAgendadas: [], idsAlunosAtivos: [] }

describe('previsaoDoMes', () => {
  it('sem nada, tudo zero', () => {
    expect(previsaoDoMes(base)).toEqual({ recebido: 0, aReceber: 0, realizadoNaoFaturado: 0, mensalidades: 0, agendado: 0, total: 0, alunosSemValor: 0 })
  })
  it('recebido só do mês; a receber inclui abertas e enviadas (canceladas e pagas fora)', () => {
    const r = previsaoDoMes({
      ...base,
      faturas: [
        { aluno_id: 'a', status: 'paga', total: 300, paga_em: '2026-10-05', periodo_fim: '2026-09-30' },
        { aluno_id: 'a', status: 'paga', total: 999, paga_em: '2026-09-05', periodo_fim: '2026-08-31' },
        { aluno_id: 'b', status: 'enviada', total: 120, paga_em: null, periodo_fim: '2026-10-14' },
        { aluno_id: 'c', status: 'aberta', total: 80, paga_em: null, periodo_fim: '2026-10-14' },
        { aluno_id: 'd', status: 'cancelada', total: 500, paga_em: null, periodo_fim: '2026-10-14' },
      ],
    })
    expect(r.recebido).toBe(300)
    expect(r.aReceber).toBe(200)
    expect(r.total).toBe(500)
  })
  it('realizado não faturado conta só aluno "por aula"', () => {
    const r = previsaoDoMes({
      ...base,
      cobrancas: [porAula('a', 100), mensal('m', 400)],
      participacoesAbertas: [{ aluno_id: 'a', valor: 100 }, { aluno_id: 'a', valor: 100 }, { aluno_id: 'm', valor: 50 }],
    })
    expect(r.realizadoNaoFaturado).toBe(200)
  })
  it('mensalidade do ciclo entra uma vez, e some quando já existe fatura cobrindo o ciclo', () => {
    const sem = previsaoDoMes({ ...base, cobrancas: [mensal('m', 400)] })
    expect(sem.mensalidades).toBe(400)
    const com = previsaoDoMes({ ...base, cobrancas: [mensal('m', 400)], faturas: [{ aluno_id: 'm', status: 'enviada', total: 400, paga_em: null, periodo_fim: '2026-10-31' }] })
    expect(com.mensalidades).toBe(0)
    expect(com.aReceber).toBe(400)
  })
  it('agendado: previstos de aulas agendadas × valor por aula; mensal e sem valor valem 0', () => {
    const r = previsaoDoMes({
      ...base,
      cobrancas: [porAula('a', 100), mensal('m', 400)],
      aulasAgendadas: [
        { status: 'agendada', aula_participantes: [{ aluno_id: 'a', status: 'previsto' }, { aluno_id: 'm', status: 'previsto' }, { aluno_id: 'z', status: 'previsto' }] },
        { status: 'agendada', aula_participantes: [{ aluno_id: 'a', status: 'previsto' }] },
        { status: 'cancelada', aula_participantes: [{ aluno_id: 'a', status: 'previsto' }] },
        { status: 'agendada', aula_participantes: [{ aluno_id: 'a', status: 'cancelou' }] },
      ],
    })
    expect(r.agendado).toBe(200)
  })
  it('cobrança inativa não conta e o aluno entra em "sem valor"', () => {
    const r = previsaoDoMes({ ...base, cobrancas: [{ ...porAula('a', 100), ativo: false }, porAula('b', 100)], idsAlunosAtivos: ['a', 'b', 'c'], aulasAgendadas: [{ status: 'agendada', aula_participantes: [{ aluno_id: 'a', status: 'previsto' }] }] })
    expect(r.agendado).toBe(0)
    expect(r.alunosSemValor).toBe(2)
  })
  it('o total soma as parcelas e arredonda centavos', () => {
    const r = previsaoDoMes({ ...base, cobrancas: [porAula('a', 33.33)], aulasAgendadas: [{ status: 'agendada', aula_participantes: [{ aluno_id: 'a', status: 'previsto' }, { aluno_id: 'a', status: 'previsto' }, { aluno_id: 'a', status: 'previsto' }] }] })
    expect(r.agendado).toBe(99.99)
    expect(r.total).toBe(99.99)
  })
})

describe('ultimoDiaDoMes', () => {
  it('meses de 30 e 31 dias, fevereiro e ano bissexto', () => {
    expect(ultimoDiaDoMes('2026-10-28')).toBe('2026-10-31')
    expect(ultimoDiaDoMes('2026-11-02')).toBe('2026-11-30')
    expect(ultimoDiaDoMes('2026-02-10')).toBe('2026-02-28')
    expect(ultimoDiaDoMes('2028-02-10')).toBe('2028-02-29')
    expect(ultimoDiaDoMes('2026-12-31')).toBe('2026-12-31')
  })
})

describe('previsaoDoMes — alunos de pacote', () => {
  it('o valor do pacote entra pela fatura e o aluno de pacote não conta como "sem valor"', () => {
    const faturas = [{ id: 'f1', aluno_id: 'a1', status: 'paga', paga_em: '2026-10-05', total: 800, periodo_fim: '2026-12-04' }] as never
    const p = previsaoDoMes({ ...base, faturas, idsAlunosAtivos: ['a1', 'a2'], idsComPacote: ['a1'] })
    expect(p.recebido).toBe(800)
    expect(p.alunosSemValor).toBe(1)
  })
})

