import { describe, expect, it } from 'vitest'
import {
  alunosInativos, brl, dataBR, dataSP, decidirEnvio, diaSemanaCurto, horaSP, inicioDaSemana, limitesDoDiaSP, montarAlunosInativos, montarBriefing,
  montarPagamentoPlano, montarPlanoExpirando, montarResumoSemanal, segredoCronValido, somarDias,
} from './notificacoes.ts'

describe('datas (fuso de São Paulo)', () => {
  it('data e hora em São Paulo, inclusive virada de dia', () => {
    expect(dataSP('2026-10-15T02:30:00Z')).toBe('2026-10-14')
    expect(horaSP('2026-10-15T15:30:00Z')).toBe('12:30')
    expect(somarDias('2026-10-31', 1)).toBe('2026-11-01')
    expect(inicioDaSemana('2026-10-18')).toBe('2026-10-12') // domingo → segunda anterior
    expect(inicioDaSemana('2026-10-12')).toBe('2026-10-12')
    expect(limitesDoDiaSP('2026-10-15').inicio.toISOString()).toBe('2026-10-15T03:00:00.000Z')
    expect(dataBR('2026-10-15')).toBe('15/10/2026')
    expect(diaSemanaCurto('2026-10-17')).toBe('sábado, 17/out')
    expect(brl(1234.5)).toBe('R$ 1.234,50')
  })
})

describe('decidirEnvio', () => {
  it('sem opt-in, sem telefone ou já enviado hoje → não envia', () => {
    expect(decidirEnvio({ optIn: false, phone: '(21) 99999-0000', jaEnviadoHoje: false })).toEqual({ enviar: false, motivo: 'sem_opt_in' })
    expect(decidirEnvio({ optIn: true, phone: null, jaEnviadoHoje: false })).toEqual({ enviar: false, motivo: 'sem_telefone' })
    expect(decidirEnvio({ optIn: true, phone: '123', jaEnviadoHoje: false })).toEqual({ enviar: false, motivo: 'sem_telefone' })
    expect(decidirEnvio({ optIn: true, phone: '(21) 99999-0000', jaEnviadoHoje: true })).toEqual({ enviar: false, motivo: 'ja_enviado_hoje' })
  })
  it('com tudo certo → envia ao número do cadastro', () => {
    expect(decidirEnvio({ optIn: true, phone: '(21) 99999-0000', jaEnviadoHoje: false })).toEqual({ enviar: true, numero: '5521999990000' })
  })
})

describe('segredoCronValido', () => {
  it('só aceita o segredo exato e longo; ausente ou curto recusa tudo', () => {
    const s = 'segredo-bem-longo-123456'
    expect(segredoCronValido(s, s)).toBe(true)
    expect(segredoCronValido('segredo-bem-longo-123457', s)).toBe(false)
    expect(segredoCronValido(null, s)).toBe(false)
    expect(segredoCronValido('curto', 'curto')).toBe(false)
    expect(segredoCronValido('x', undefined)).toBe(false)
  })
})

describe('briefing diário', () => {
  const clima = { emoji: '🌧️', texto: 'Chuva', min: 19, max: 26, chuvaProb: 70 }
  it('sem aulas → null (não envia)', () => {
    expect(montarBriefing({ nome: 'André', aulas: [], clima })).toBeNull()
  })
  it('com aulas: ordena por horário, usa "sem local definido" e avisa de chuva ≥ 40%', () => {
    const m = montarBriefing({ nome: 'André Scherer', clima, aulas: [{ horario: '18:00', aluno: 'Bruno Paulo', local: null }, { horario: '07:30', aluno: 'Lucas Teste', local: 'Academia X' }] })!
    expect(m).toContain('☀️ Bom dia, André!')
    expect(m).toContain('Sua agenda de hoje (2 alunos)')
    expect(m.indexOf('07:30 Lucas @ Academia X')).toBeLessThan(m.indexOf('18:00 Bruno @ sem local definido'))
    expect(m).toContain('🌧️ Chuva | 19–26°C')
    expect(m).toContain('Chuva: 70% de probabilidade')
    expect(m).toContain('⚠️ Considere avisar alunos de treino ao ar livre.')
  })
  it('sem aviso com pouca chuva; sem clima, a seção some', () => {
    expect(montarBriefing({ nome: null, clima: { ...clima, chuvaProb: 10 }, aulas: [{ horario: '07:00', aluno: 'Ana', local: 'X' }] })).not.toContain('⚠️')
    const s = montarBriefing({ nome: 'A', clima: null, aulas: [{ horario: '07:00', aluno: 'Ana', local: 'X' }] })!
    expect(s).not.toContain('Previsão')
    expect(s).toContain('1 aluno)')
  })
})

describe('financeiro (plano do personal)', () => {
  it('pagamento confirmado e plano expirando', () => {
    expect(montarPagamentoPlano({ plano: 'Mensal', valor: 15, ate: '2026-11-14' })).toBe('💰 Pagamento confirmado!\nPlano: Mensal\nValor: R$ 15,00\nAcesso até: 14/11/2026')
    const e = montarPlanoExpirando({ plano: 'Mensal', ate: '2026-10-18' })
    expect(e).toContain('Vence em domingo, 18/out')
    expect(e).toContain('Plano atual: Mensal')
  })
})

describe('resumo semanal', () => {
  it('sem nenhuma atividade → null', () => {
    expect(montarResumoSemanal({ realizados: 0, agendados: 0, novosAlunos: 0, receita: 0, inativos: [] })).toBeNull()
  })
  it('monta o resumo, lista os inativos do mais parado ao menos e corta em 8', () => {
    const inativos = Array.from({ length: 10 }, (_, i) => ({ nome: `Aluno ${i}`, dias: 10 + i }))
    const m = montarResumoSemanal({ realizados: 12, agendados: 15, novosAlunos: 2, receita: 1500, inativos })!
    expect(m).toContain('🏋️ Treinos: 12 realizados / 15 agendados')
    expect(m).toContain('💰 Receita: R$ 1.500,00')
    expect(m.indexOf('Aluno 9 (19 dias)')).toBeLessThan(m.indexOf('Aluno 8 (18 dias)'))
    expect(m).toContain('— e mais 2')
    expect(montarResumoSemanal({ realizados: 3, agendados: 3, novosAlunos: 0, receita: 0, inativos: [] })).not.toContain('Sem treino há')
  })
})

describe('alunos inativos', () => {
  const alunos = [{ id: '1', nome: 'Ana' }, { id: '2', nome: 'Bia' }, { id: '3', nome: 'Caio' }]
  const ultimos = new Map([['1', '2026-10-05'], ['2', '2026-10-12']])
  it('exatamente N dias, ou N+; sem treino algum é ignorado', () => {
    expect(alunosInativos(alunos, ultimos, '2026-10-15', 10, true)).toEqual([{ nome: 'Ana', dias: 10, ultimo: '2026-10-05' }])
    expect(alunosInativos(alunos, ultimos, '2026-10-22', 10, false).map((i) => i.nome)).toEqual(['Ana', 'Bia'])
    expect(alunosInativos(alunos, new Map(), '2026-10-15', 10, true)).toEqual([])
  })
  it('mensagem: null sem inativos; texto com nome, dias e último treino', () => {
    expect(montarAlunosInativos([])).toBeNull()
    expect(montarAlunosInativos([{ nome: 'Ana', dias: 10, ultimo: '2026-10-05' }])).toBe('👋 Aluno inativo\nAna não registra treino há 10 dias.\nÚltimo: 05/10/2026')
  })
})
