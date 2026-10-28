import { describe, expect, it } from 'vitest'
import { priorizarAtividades } from './priorizarAtividade'

const a = (id: string, notas: string | null = null) => ({ id, notas_aluno: notas })

describe('priorizarAtividades', () => {
  it('observação nova sobe e o resto mantém a ordem', () => {
    const r = priorizarAtividades([a('1'), a('2', 'dor no ombro'), a('3'), a('4', 'ok')], new Set(['2', '3', '4']))
    expect(r.map((x) => x.id)).toEqual(['2', '4', '1', '3'])
  })
  it('sem observação nova a ordem não muda', () => {
    expect(priorizarAtividades([a('1'), a('2', 'x')], new Set()).map((x) => x.id)).toEqual(['1', '2'])
  })
  it('notificação sem texto de observação não conta', () => {
    expect(priorizarAtividades([a('1'), a('2')], new Set(['2'])).map((x) => x.id)).toEqual(['1', '2'])
  })
})
