import { describe, expect, it } from 'vitest'
import { descreverPerdas, mensagemApagarAluno, diasRestantesLixeira, rotuloLixeira, LIXEIRA_DIAS } from './apagarAluno'

const zero = { sessoes: 0, treinos: 0, avaliacoes: 0, faturas: 0 }

describe('descreverPerdas', () => {
  it('lista só o que existe, no singular e no plural, com "e" antes do último', () => {
    expect(descreverPerdas({ sessoes: 12, treinos: 3, avaliacoes: 0, faturas: 5 })).toBe('12 sessões de treino, 3 treinos montados e 5 faturas')
    expect(descreverPerdas({ sessoes: 1, treinos: 0, avaliacoes: 1, faturas: 0 })).toBe('1 sessão de treino e 1 avaliação')
    expect(descreverPerdas({ ...zero, faturas: 1 })).toBe('1 fatura')
  })
  it('vazio quando não há nada', () => expect(descreverPerdas(zero)).toBe(''))
})

describe('mensagemApagarAluno', () => {
  it('mostra o que será perdido e sugere deixar arquivado', () => {
    const m = mensagemApagarAluno('Ana', { sessoes: 12, treinos: 3, avaliacoes: 0, faturas: 5 })
    expect(m).toContain('apaga Ana agora, para sempre')
    expect(m).toContain('12 sessões de treino, 3 treinos montados e 5 faturas')
    expect(m).toContain('não dá para desfazer')
    expect(m).toContain('deixe arquivado')
  })
  it('aluno sem histórico: diz que não há nada registrado', () => {
    expect(mensagemApagarAluno('Ana', zero)).toContain('não tem treinos, avaliações nem faturas')
  })
  it('sem conseguir contar (sem rede): fala do que some sem inventar números', () => {
    const m = mensagemApagarAluno('Ana', null)
    expect(m).toContain('todo o histórico')
    expect(m).not.toMatch(/\d/)
  })
})

describe('lixeira de 30 dias', () => {
  const apagado = '2026-10-01T12:00:00Z'
  it('conta os dias que faltam, arredondando para cima', () => {
    expect(LIXEIRA_DIAS).toBe(30)
    expect(diasRestantesLixeira(apagado, new Date('2026-10-01T12:00:00Z'))).toBe(30)
    expect(diasRestantesLixeira(apagado, new Date('2026-10-11T18:00:00Z'))).toBe(20)
    expect(diasRestantesLixeira(apagado, new Date('2026-10-31T11:00:00Z'))).toBe(1)
  })
  it('nunca fica negativo e fala "Some hoje" no prazo final', () => {
    expect(diasRestantesLixeira(apagado, new Date('2026-12-01T00:00:00Z'))).toBe(0)
    expect(rotuloLixeira(apagado, new Date('2026-12-01T00:00:00Z'))).toBe('Some hoje')
  })
  it('singular e plural', () => {
    expect(rotuloLixeira(apagado, new Date('2026-10-31T11:00:00Z'))).toBe('Some em 1 dia')
    expect(rotuloLixeira(apagado, new Date('2026-10-11T12:00:00Z'))).toBe('Some em 20 dias')
  })
})
