import { describe, expect, it } from 'vitest'
import { duracaoAtipica, mensagemDuracaoAtipica, textoDuracao } from './duracaoAtipica'

describe('duracaoAtipica', () => {
  it('abaixo de 20 min é curta; 20 min já é normal', () => {
    expect(duracaoAtipica(19)).toBe('curta')
    expect(duracaoAtipica(5)).toBe('curta')
    expect(duracaoAtipica(20)).toBeNull()
  })
  it('3 h ou mais é longa; 2 h 59 min é normal', () => {
    expect(duracaoAtipica(179)).toBeNull()
    expect(duracaoAtipica(180)).toBe('longa')
    expect(duracaoAtipica(600)).toBe('longa')
  })
  it('em branco, zero ou inválido nunca gera alerta (a pessoa pode pular o tempo)', () => {
    expect(duracaoAtipica(null)).toBeNull()
    expect(duracaoAtipica(undefined)).toBeNull()
    expect(duracaoAtipica(0)).toBeNull()
    expect(duracaoAtipica(Number.NaN)).toBeNull()
  })
})

describe('textos', () => {
  it('formata o tempo', () => {
    expect(textoDuracao(45)).toBe('45 min')
    expect(textoDuracao(75)).toBe('1 h 15 min')
    expect(textoDuracao(180)).toBe('3 h')
  })
  it('a mensagem cita o tempo, diz se é curto ou longo e explica o porquê', () => {
    expect(mensagemDuracaoAtipica(12)).toContain('12 min')
    expect(mensagemDuracaoAtipica(12)).toContain('curto')
    expect(mensagemDuracaoAtipica(200)).toContain('3 h 20 min')
    expect(mensagemDuracaoAtipica(200)).toContain('longo')
    expect(mensagemDuracaoAtipica(200)).toContain('Performance')
    expect(mensagemDuracaoAtipica(200, 'aula')).toContain('agenda')
  })
})
