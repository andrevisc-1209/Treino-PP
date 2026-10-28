import { describe, expect, it } from 'vitest'
import { avaliacaoAlterada, avaliacaoDaFatura, citaDadoDeSaude, colunasDaAvaliacao, textosDaAvaliacao, validarAvaliacao } from './avaliacao'

describe('avaliação do personal', () => {
  it('sem nada escrito não há avaliação (a seção some do relatório)', () => {
    expect(avaliacaoDaFatura({})).toBeNull()
    expect(avaliacaoDaFatura({ avaliacao_conquistas: '  ', avaliacao_atencao: null })).toBeNull()
  })
  it('com um campo escrito, os outros ficam null', () => {
    expect(avaliacaoDaFatura({ avaliacao_proximos: ' Correr 10 km ' })).toEqual({ conquistas: null, atencao: null, proximos: 'Correr 10 km' })
  })
  it('digitado → colunas: apara espaços e vazio vira null', () => {
    expect(colunasDaAvaliacao({ conquistas: ' Boa constância ', atencao: '   ', proximos: '' })).toEqual({ avaliacao_conquistas: 'Boa constância', avaliacao_atencao: null, avaliacao_proximos: null })
  })
  it('detecta alteração ignorando espaços nas pontas', () => {
    const a = textosDaAvaliacao({ avaliacao_conquistas: 'Boa' })
    expect(avaliacaoAlterada(a, { ...a, conquistas: ' Boa ' })).toBe(false)
    expect(avaliacaoAlterada(a, { ...a, atencao: 'Alongar' })).toBe(true)
  })
  it('limite de 500 caracteres por campo, igual ao banco', () => {
    expect(validarAvaliacao({ conquistas: 'x'.repeat(500), atencao: '', proximos: '' })).toBeNull()
    expect(validarAvaliacao({ conquistas: '', atencao: 'x'.repeat(501), proximos: '' })).toMatch(/Pontos de atenção/)
  })
  it('avisa quando o texto parece citar saúde', () => {
    expect(citaDadoDeSaude({ conquistas: '', atencao: 'Cuidado com a lesão no joelho', proximos: '' })).toBe(true)
    expect(citaDadoDeSaude({ conquistas: 'Voltou da CIRURGIA bem', atencao: '', proximos: '' })).toBe(true)
    expect(citaDadoDeSaude({ conquistas: 'Tomando remédio para pressão', atencao: '', proximos: '' })).toBe(true)
    expect(citaDadoDeSaude({ conquistas: 'Ótima constância e evolução na corrida', atencao: 'Alongar mais', proximos: 'Correr 10 km' })).toBe(false)
  })
})
