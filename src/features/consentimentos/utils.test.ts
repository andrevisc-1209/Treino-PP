import { describe, expect, it } from 'vitest'
import { contarPorStatus, dataHoraSP, filtrarConsentimentos, normalizarStatus, pendenteExpirado, type LinhaConsentimento } from './utils'

const linha = (nome: string, status: LinhaConsentimento['status'], extra: Partial<LinhaConsentimento> = {}): LinhaConsentimento => ({
  aluno_id: nome,
  nome,
  status,
  canal: null,
  enviado_at: null,
  respondido_at: null,
  ...extra,
})

const linhas = [linha('João Silva', 'confirmado'), linha('Maria Souza', 'pendente'), linha('Joana Lima', 'negado'), linha('Pedro', 'nao_solicitado')]

describe('consentimentos', () => {
  it('normaliza o status do banco (null = não solicitado)', () => {
    expect(normalizarStatus(null)).toBe('nao_solicitado')
    expect(normalizarStatus('pendente')).toBe('pendente')
    expect(normalizarStatus('lixo')).toBe('nao_solicitado')
  })
  it('filtra por status e por nome sem acento/maiúsculas', () => {
    expect(filtrarConsentimentos(linhas, { status: 'todos', busca: '' })).toHaveLength(4)
    expect(filtrarConsentimentos(linhas, { status: 'pendente', busca: '' }).map((l) => l.nome)).toEqual(['Maria Souza'])
    expect(filtrarConsentimentos(linhas, { status: 'todos', busca: 'joao' }).map((l) => l.nome)).toEqual(['João Silva'])
    expect(filtrarConsentimentos(linhas, { status: 'todos', busca: 'JOA' }).map((l) => l.nome)).toEqual(['João Silva', 'Joana Lima'])
    expect(filtrarConsentimentos(linhas, { status: 'negado', busca: 'maria' })).toEqual([])
  })
  it('conta por status', () => {
    expect(contarPorStatus(linhas)).toEqual({ todos: 4, pendente: 1, confirmado: 1, negado: 1, nao_solicitado: 1 })
  })
  it('pendente expira em 7 dias', () => {
    const agora = new Date('2026-10-20T12:00:00Z').getTime()
    expect(pendenteExpirado({ status: 'pendente', enviado_at: '2026-10-10T12:00:00Z' }, agora)).toBe(true)
    expect(pendenteExpirado({ status: 'pendente', enviado_at: '2026-10-18T12:00:00Z' }, agora)).toBe(false)
    expect(pendenteExpirado({ status: 'confirmado', enviado_at: '2026-10-01T12:00:00Z' }, agora)).toBe(false)
  })
  it('data e hora no fuso de São Paulo', () => {
    expect(dataHoraSP('2026-10-07T01:30:00Z')).toBe('06/10/2026 22:30')
    expect(dataHoraSP(null)).toBe('—')
  })
})
