import { describe, expect, it } from 'vitest'
import {
  alunosInativos, ehModalidadeRotulo, montarFaturasVencidas, montarTreinosConcluidos, brl, dataBR, dataSP, decidirEnvio, diaSemanaCurto, horaSP, inicioDaSemana, limitesDoDiaSP, montarAlunosInativos, montarBriefing,
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
  const ok = '2026-10-20T12:00:00Z'
  it('sem opt-in, sem telefone, não verificado ou já enviado hoje → não envia', () => {
    expect(decidirEnvio({ optIn: false, phone: '(21) 99999-0000', phoneVerifiedAt: ok, jaEnviadoHoje: false })).toEqual({ enviar: false, motivo: 'sem_opt_in' })
    expect(decidirEnvio({ optIn: true, phone: null, phoneVerifiedAt: ok, jaEnviadoHoje: false })).toEqual({ enviar: false, motivo: 'sem_telefone' })
    expect(decidirEnvio({ optIn: true, phone: '123', phoneVerifiedAt: ok, jaEnviadoHoje: false })).toEqual({ enviar: false, motivo: 'sem_telefone' })
    expect(decidirEnvio({ optIn: true, phone: '(21) 99999-0000', phoneVerifiedAt: null, jaEnviadoHoje: false })).toEqual({ enviar: false, motivo: 'telefone_nao_verificado' })
    expect(decidirEnvio({ optIn: true, phone: '(21) 99999-0000', phoneVerifiedAt: undefined, jaEnviadoHoje: false })).toEqual({ enviar: false, motivo: 'telefone_nao_verificado' })
    expect(decidirEnvio({ optIn: true, phone: '(21) 99999-0000', phoneVerifiedAt: ok, jaEnviadoHoje: true })).toEqual({ enviar: false, motivo: 'ja_enviado_hoje' })
  })
  it('com tudo certo (inclusive telefone verificado) → envia ao número do cadastro', () => {
    expect(decidirEnvio({ optIn: true, phone: '(21) 99999-0000', phoneVerifiedAt: ok, jaEnviadoHoje: false })).toEqual({ enviar: true, numero: '5521999990000' })
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
  const chuva = { emoji: '🌧️', texto: 'Chuva', min: 23, max: 27, chuvaProb: 88 }
  const aula = (horario: string, aluno: string, local: string | null) => ({ horario, aluno, local })
  it('sem aulas → null (não envia)', () => {
    expect(montarBriefing({ nome: 'André', aulas: [], clima: chuva })).toBeNull()
  })
  it('1 aluno: frase única com horário e local', () => {
    const m = montarBriefing({ nome: 'André Scherer', aulas: [aula('07:00', 'Carlos Silva', 'Smartfit Laranjeiras')], clima: null })!
    expect(m).toBe('Bom dia, André! 👋\n\nVocê tem 1 treino hoje — Carlos às 07:00 na Smartfit Laranjeiras.\n\nBoa sessão! 💪')
  })
  it('2+ alunos: lista ordenada por horário com • e aviso de chuva ≥ 40%', () => {
    const m = montarBriefing({
      nome: 'André',
      clima: chuva,
      aulas: [aula('14:00', 'Paula', 'Smartfit Laranjeiras'), aula('07:00', 'Carlos', 'Smartfit Laranjeiras'), aula('11:00', 'Marcos', 'Arena Fit')],
    })!
    expect(m).toBe(
      'Bom dia, André! 👋\n\nVocê tem 3 treinos hoje:\n• Carlos — 07:00 @ Smartfit Laranjeiras\n• Marcos — 11:00 @ Arena Fit\n• Paula — 14:00 @ Smartfit Laranjeiras\n\n' +
        '⚠️ 88% de chance de chuva hoje (23–27°C) — vale avisar quem treina ao ar livre.\n\nBoa sessão! 💪',
    )
  })
  it('chuva abaixo de 40% ou clima indisponível: sem o bloco de chuva; sem local, omite o local', () => {
    const base = [aula('07:00', 'Ana', null), aula('08:00', 'Bia', 'X')]
    expect(montarBriefing({ nome: 'A', aulas: base, clima: { ...chuva, chuvaProb: 39 } })).not.toContain('chuva')
    const m = montarBriefing({ nome: 'A', aulas: base, clima: null })!
    expect(m).not.toContain('chuva')
    expect(m).toContain('• Ana — 07:00\n')
    expect(montarBriefing({ nome: 'A', aulas: base, clima: { ...chuva, chuvaProb: 40 } })).toContain('40% de chance de chuva')
  })
})

describe('financeiro (plano do personal)', () => {
  it('pagamento confirmado e plano expirando', () => {
    expect(montarPagamentoPlano({ plano: 'Mensal', valor: 15, ate: '2026-11-14' })).toBe('💰 Pagamento confirmado!\nPlano: Mensal\nValor: R$ 15,00\nAcesso até: 14/11/2026')
    expect(montarPlanoExpirando({ nome: 'André Scherer', plano: 'Mensal', ate: '2026-10-18' })).toBe(
      'André, seu plano Mensal vence em 3 dias (domingo, 18/out) — vale renovar em Configurações › Assinatura antes de perder o acesso.',
    )
    expect(montarPlanoExpirando({ nome: null, plano: null, ate: '2026-10-18' })).toMatch(/^Seu plano vence em 3 dias/)
  })
})

describe('resumo semanal', () => {
  const inat = (n: number) => Array.from({ length: n }, (_, i) => ({ nome: `Aluno ${i}`, dias: 10 + i }))
  it('sem treinos, receita nem inativos → null', () => {
    expect(montarResumoSemanal({ nome: 'André', realizados: 0, agendados: 0, receita: 0, inativos: [] })).toBeNull()
  })
  it('só com treinos e receita: tom de conversa, sem bloco de inativos', () => {
    expect(montarResumoSemanal({ nome: 'André Scherer', realizados: 3, agendados: 2, receita: 300, inativos: [] })).toBe(
      'Boa semana, André! Aqui vai o balanço 📋\n\nEssa semana você teve 3 treinos realizados e 2 agendados. Receita: R$ 300,00.\n\nBoa semana! 🚀',
    )
  })
  it('até 3 inativos: lista todos, sem "...e mais"', () => {
    const m = montarResumoSemanal({ nome: 'A', realizados: 1, agendados: 1, receita: 0, inativos: inat(2) })!
    expect(m).toContain('⚠️ 2 alunos estão sumidos há mais de 10 dias:')
    expect(m).toContain('- Aluno 1 — 11 dias\n- Aluno 0 — 10 dias')
    expect(m).not.toContain('...e mais')
    expect(montarResumoSemanal({ nome: 'A', realizados: 1, agendados: 1, receita: 0, inativos: inat(1) })).toContain('⚠️ 1 aluno está sumido há mais de 10 dias:')
  })
  it('mais de 3 inativos: os 3 mais parados e "...e mais X"', () => {
    const m = montarResumoSemanal({ nome: 'André', realizados: 3, agendados: 2, receita: 300, inativos: inat(8) })!
    expect(m).toContain('⚠️ 8 alunos estão sumidos há mais de 10 dias. Os mais críticos:\n- Aluno 7 — 17 dias\n- Aluno 6 — 16 dias\n- Aluno 5 — 15 dias\n...e mais 5.\nVale dar um oi pra eles essa semana!')
  })
  it('só inativos (sem treino nem receita) ainda envia', () => {
    const m = montarResumoSemanal({ nome: 'A', realizados: 0, agendados: 0, receita: 0, inativos: inat(1) })!
    expect(m).toContain('Essa semana você não teve treinos.')
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
    expect(montarAlunosInativos('André', [])).toBeNull()
    expect(montarAlunosInativos('André Scherer', [{ nome: 'Carlos Silva', dias: 10, ultimo: '2026-10-05' }])).toBe('Oi André! Carlos está há 10 dias sem treinar. Que tal mandar uma mensagem? 💬')
    const dois = [{ nome: 'Carlos', dias: 10, ultimo: '2026-10-05' }, { nome: 'Bia', dias: 10, ultimo: '2026-10-05' }, { nome: 'Ana', dias: 10, ultimo: '2026-10-05' }]
    expect(montarAlunosInativos('André', dois)).toBe('Ana e mais 2 alunos completaram 10 dias sem treinar hoje. Vale dar um oi! 💬')
    expect(montarAlunosInativos('André', dois.slice(0, 2))).toBe('Bia e mais 1 aluno completou 10 dias sem treinar hoje. Vale dar um oi! 💬')
  })
})

describe('cobranças de alunos vencidas', () => {
  const f = (nome: string, dias: number, valor = 300) => ({ nome, dias, valor })
  it('sem faturas → null', () => {
    expect(montarFaturasVencidas('André', [])).toBeNull()
  })
  it('1 cobrança: textos de 1, 3 e 7 dias (sem presumir gênero do aluno)', () => {
    expect(montarFaturasVencidas('André Scherer', [f('Carlos Silva', 1)])).toBe('Oi André! A cobrança de Carlos (R$ 300,00) venceu ontem e ainda não foi paga. Só pra não deixar passar 👀')
    expect(montarFaturasVencidas('André', [f('Carlos', 3)])).toBe('André, a cobrança de Carlos (R$ 300,00) está vencida há 3 dias. Vale uma conversa?')
    expect(montarFaturasVencidas('André', [f('Carlos', 7)])).toBe('André, faz uma semana que a cobrança de Carlos (R$ 300,00) venceu. Pode ser um bom momento pra entrar em contato.')
  })
  it('até 3: lista todas, da mais antiga para a mais nova; mais de 3: top 3 + "...e mais X"', () => {
    expect(montarFaturasVencidas('André', [f('Marcos', 1), f('Carlos', 7), f('Julia', 3)])).toBe(
      'André, algumas cobranças venceram e ainda não foram pagas:\n• Carlos — 7 dias\n• Julia — 3 dias\n• Marcos — 1 dia',
    )
    const m = montarFaturasVencidas('André', [f('A', 1), f('B', 3), f('C', 7), f('D', 7), f('E', 3)])!
    expect(m.split('\n').filter((l) => l.startsWith('•'))).toHaveLength(3)
    expect(m).toContain('...e mais 2.')
  })
})

describe('treino à distância concluído', () => {
  it('sem treinos → null; 1 treino com e sem modalidade', () => {
    expect(montarTreinosConcluidos([])).toBeNull()
    expect(montarTreinosConcluidos([{ aluno: 'Carlos Silva', modalidade: 'Natação' }])).toBe('✅ Carlos concluiu o treino de natação à distância. Mandou bem! 💪')
    expect(montarTreinosConcluidos([{ aluno: 'Carlos Silva', modalidade: null }])).toBe('✅ Carlos acabou de concluir o treino à distância! 💪')
  })
  it('vários: lista nomes sem repetir e corta em 5; só nome e modalidade (nada de resultado)', () => {
    const lista = ['Carlos', 'Julia', 'Marcos', 'Carlos'].map((aluno) => ({ aluno, modalidade: 'natação' }))
    expect(montarTreinosConcluidos(lista)).toBe('✅ 4 treinos à distância foram concluídos:\n• Carlos\n• Julia\n• Marcos')
    const muitos = Array.from({ length: 8 }, (_, i) => ({ aluno: `Aluno${i}`, modalidade: null }))
    expect(montarTreinosConcluidos(muitos)).toContain('...e mais 3.')
  })
  it('rótulo da modalidade', () => {
    expect(ehModalidadeRotulo('natacao')).toBe('natação')
    expect(ehModalidadeRotulo('xyz')).toBeNull()
    expect(ehModalidadeRotulo(null)).toBeNull()
  })
})
