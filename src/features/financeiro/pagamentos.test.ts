import { describe, expect, it } from 'vitest'
import { faturasEnviadasPendentes, faturasPagasDoMes, mesDaData, rotuloDoMes, somarMeses, totalRecebidoDoMes, type FaturaDePagamento } from './pagamentos'

const f = (p: Partial<FaturaDePagamento> & { id: string }): FaturaDePagamento => ({
  aluno_id: 'a1',
  status: 'paga',
  total: 100,
  vencimento: null,
  paga_em: null,
  periodo_inicio: '2026-10-01',
  periodo_fim: '2026-10-31',
  ...p,
})

// os dados reais que mostraram o problema (mês de novembro de 2026): 4 pagas com valor + 1 de R$ 0,00 + 1 de pacote paga em outubro
const FATURAS = [
  f({ id: 'ana-pacote', total: 500, paga_em: '2026-10-28', periodo_inicio: '2026-10-28', periodo_fim: '2026-12-26' }),
  f({ id: 'paulo-h', total: 900, paga_em: '2026-11-12', periodo_inicio: '2026-10-12', periodo_fim: '2026-11-11' }),
  f({ id: 'iris', total: 150, paga_em: '2026-11-11' }),
  f({ id: 'paulo-p', total: 200, paga_em: '2026-11-12' }),
  f({ id: 'thiago-zero', total: 0, paga_em: '2026-11-11' }),
  f({ id: 'ricardo', total: 120, paga_em: '2026-11-11', periodo_inicio: '2026-09-05', periodo_fim: '2026-10-04' }),
  f({ id: 'marcos', total: 400, paga_em: '2026-10-29' }),
  f({ id: 'aberta', status: 'aberta', total: 1000, paga_em: null }),
]

describe('faturasPagasDoMes', () => {
  it('lista as pagas pela data do pagamento, de qualquer ciclo, da mais recente para a mais antiga', () => {
    expect(faturasPagasDoMes(FATURAS, '2026-11').map((x) => x.id)).toEqual(['paulo-h', 'paulo-p', 'iris', 'ricardo'])
  })
  it('deixa de fora fatura de R$ 0,00, aberta e a paga em outro mês', () => {
    const ids = faturasPagasDoMes(FATURAS, '2026-11').map((x) => x.id)
    expect(ids).not.toContain('thiago-zero')
    expect(ids).not.toContain('aberta')
    expect(ids).not.toContain('ana-pacote')
  })
  it('um mês anterior mostra o histórico daquele mês (incluindo o pacote)', () => {
    expect(faturasPagasDoMes(FATURAS, '2026-10').map((x) => x.id)).toEqual(['marcos', 'ana-pacote'])
  })
  it('mês sem pagamento = lista vazia', () => expect(faturasPagasDoMes(FATURAS, '2026-08')).toEqual([]))
})

describe('totalRecebidoDoMes (o cartão "Recebido no mês" usa a mesma conta da lista)', () => {
  it('soma exatamente o que a lista mostra', () => {
    expect(totalRecebidoDoMes(FATURAS, '2026-11')).toBe(1370)
    expect(totalRecebidoDoMes(FATURAS, '2026-11')).toBe(faturasPagasDoMes(FATURAS, '2026-11').reduce((a, x) => a + x.total, 0))
  })
})

describe('faturasEnviadasPendentes', () => {
  const hoje = '2026-11-12'
  const env = (id: string, extra: Partial<FaturaDePagamento> = {}) => f({ id, status: 'enviada', paga_em: null, vencimento: '2026-11-20', enviada_em: '2026-11-05', ...extra })
  it('traz as enviadas ainda não vencidas, de qualquer ciclo, mais antigas primeiro', () => {
    const lista = faturasEnviadasPendentes([env('b', { enviada_em: '2026-11-08' }), env('a', { enviada_em: '2026-10-30', periodo_fim: '2026-10-20' }), env('c')], hoje)
    expect(lista.map((x) => x.id)).toEqual(['a', 'c', 'b'])
  })
  it('as vencidas ficam em "Em atraso", e abertas, pagas e de R$ 0,00 não entram', () => {
    const lista = faturasEnviadasPendentes([env('vencida', { vencimento: '2026-11-01' }), env('zero', { total: 0 }), f({ id: 'paga' }), f({ id: 'aberta', status: 'aberta' }), env('ok')], hoje)
    expect(lista.map((x) => x.id)).toEqual(['ok'])
  })
})

describe('mês', () => {
  it('mesDaData, somarMeses (virada de ano) e rotuloDoMes', () => {
    expect(mesDaData('2026-11-12')).toBe('2026-11')
    expect(somarMeses('2026-11', -1)).toBe('2026-10')
    expect(somarMeses('2026-01', -1)).toBe('2025-12')
    expect(somarMeses('2026-12', 1)).toBe('2027-01')
    expect(rotuloDoMes('2026-03')).toBe('março de 2026')
  })
})
