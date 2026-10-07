import { describe, expect, it } from 'vitest'
import type { ConsentimentosPersonal } from './api'
import { filtrarConsentimentosAdmin, totaisConsentimento } from './consentimentos'

const p = (nome: string, email: string, c: number, pe: number, n: number, ns: number): ConsentimentosPersonal => ({
  professional_id: nome,
  nome,
  email,
  total_alunos: c + pe + n + ns,
  confirmados: c,
  pendentes: pe,
  negados: n,
  nao_solicitados: ns,
})
const linhas = [p('André Scherer', 'andre@x.com', 12, 3, 0, 2), p('Beatriz Lima', 'bia@y.com', 0, 0, 1, 4), p('Carlos', 'carlos@z.com', 0, 0, 0, 0)]

describe('consentimentos do admin', () => {
  it('busca por nome ou e-mail, sem acento', () => {
    expect(filtrarConsentimentosAdmin(linhas, { busca: 'andre', status: '' }).map((l) => l.nome)).toEqual(['André Scherer'])
    expect(filtrarConsentimentosAdmin(linhas, { busca: 'bia@', status: '' }).map((l) => l.nome)).toEqual(['Beatriz Lima'])
  })
  it('filtra por status: só quem tem ao menos um aluno naquele status', () => {
    expect(filtrarConsentimentosAdmin(linhas, { busca: '', status: 'negados' }).map((l) => l.nome)).toEqual(['Beatriz Lima'])
    expect(filtrarConsentimentosAdmin(linhas, { busca: '', status: 'confirmados' }).map((l) => l.nome)).toEqual(['André Scherer'])
    expect(filtrarConsentimentosAdmin(linhas, { busca: '', status: 'nao_solicitados' })).toHaveLength(2)
  })
  it('soma os totais', () => {
    expect(totaisConsentimento(linhas)).toEqual({ alunos: 22, confirmados: 12, pendentes: 3, negados: 1, nao_solicitados: 6 })
  })
})
