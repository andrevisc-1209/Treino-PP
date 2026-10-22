import { describe, expect, it } from 'vitest'
import { calcularAssinatura, erroPorModoLeitura, type DadosAssinatura, type LinhaAssinatura } from './useAssinatura'

const agora = new Date('2026-10-22T12:00:00Z').getTime()
const DIA = 86_400_000
const linha = (extra: Partial<LinhaAssinatura> = {}): LinhaAssinatura => ({
  status: 'trial',
  plano: null,
  trial_fim: new Date(agora + 5 * DIA).toISOString(),
  assinatura_fim: null,
  ...extra,
})
const dados = (l: LinhaAssinatura, ativoNoServidor: boolean | null): DadosAssinatura => ({ linha: l, ativoNoServidor })

describe('calcularAssinatura: o veredito do SERVIDOR manda', () => {
  it('servidor diz inativo, mesmo que o relógio do aparelho diga que o trial vale (aparelho com data atrasada)', () => {
    expect(calcularAssinatura(dados(linha(), false), agora).estaAtivo).toBe(false)
  })
  it('servidor diz ativo mesmo com o cálculo local vencido (relógio do aparelho adiantado)', () => {
    const vencido = linha({ trial_fim: new Date(agora - DIA).toISOString() })
    expect(calcularAssinatura(dados(vencido, true), agora).estaAtivo).toBe(true)
  })
  it('sem resposta do servidor cai no cálculo local (só para a tela)', () => {
    expect(calcularAssinatura(dados(linha(), null), agora).estaAtivo).toBe(true)
    expect(calcularAssinatura(dados(linha({ trial_fim: new Date(agora - DIA).toISOString() }), null), agora).estaAtivo).toBe(false)
    expect(calcularAssinatura(dados(linha({ status: 'ativa', plano: 'mensal', assinatura_fim: new Date(agora + DIA).toISOString() }), null), agora).estaAtivo).toBe(true)
    expect(calcularAssinatura(dados(linha({ status: 'cancelada' }), null), agora).estaAtivo).toBe(false)
  })
  it('dias restantes do trial', () => {
    expect(calcularAssinatura(dados(linha(), true), agora).diasRestantesTrial).toBe(5)
    expect(calcularAssinatura(dados(linha({ status: 'ativa' }), true), agora).diasRestantesTrial).toBeNull()
  })
})

describe('erroPorModoLeitura: só explica o motivo quando o erro é de permissão E o servidor já disse "inativo"', () => {
  const inativo = dados(linha(), false)
  it('erro de RLS/permissão com assinatura inativa → mensagem do modo leitura', () => {
    expect(erroPorModoLeitura({ code: '42501', message: 'new row violates row-level security policy for table "alunos"' }, inativo)).toBe(true)
    expect(erroPorModoLeitura({ message: 'permission denied for table aulas' }, inativo)).toBe(true)
  })
  it('assinatura ativa, desconhecida ou sem cache → mantém a mensagem genérica de permissão', () => {
    expect(erroPorModoLeitura({ code: '42501', message: 'x' }, dados(linha(), true))).toBe(false)
    expect(erroPorModoLeitura({ code: '42501', message: 'x' }, dados(linha(), null))).toBe(false)
    expect(erroPorModoLeitura({ code: '42501', message: 'x' }, undefined)).toBe(false)
  })
  it('outros erros (rede, validação) nunca viram "assine o plano"', () => {
    expect(erroPorModoLeitura(new Error('Failed to fetch'), inativo)).toBe(false)
    expect(erroPorModoLeitura({ code: '23514', message: 'violates check constraint' }, inativo)).toBe(false)
    expect(erroPorModoLeitura(null, inativo)).toBe(false)
  })
})
