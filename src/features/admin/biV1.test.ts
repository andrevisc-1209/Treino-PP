import { describe, expect, it } from 'vitest'
import { conversaoParaPagante, custoPorPagante, detalheDoMotivo, etapasDoFunil, formatarMediana, lerInvestimento, linkContatoPersonal, maiorGargalo, normalizarBIv1, normalizarListaAcao, progressoDaMeta, ritmoSemanal, rotuloOrigem } from './biV1'

describe('progressoDaMeta', () => {
  it('faltam, percentual e ritmo semanal necessário (arredonda para cima)', () => {
    const p = progressoDaMeta(2, '2026-10-28', 100, '2027-01-26')
    expect(p.faltam).toBe(98)
    expect(p.percentual).toBe(2)
    expect(p.diasRestantes).toBe(90)
    expect(p.semanasRestantes).toBe(12.9)
    expect(p.porSemanaNecessario).toBe(8)
    expect(p.atingida).toBe(false)
  })
  it('meta atingida e prazo vencido', () => {
    expect(progressoDaMeta(100, '2026-12-01').atingida).toBe(true)
    expect(progressoDaMeta(100, '2026-12-01').porSemanaNecessario).toBe(0)
    const v = progressoDaMeta(40, '2027-02-10')
    expect(v.vencida).toBe(true)
    expect(v.porSemanaNecessario).toBe(60)
  })
  it('na última semana, o necessário é tudo o que falta', () => {
    expect(progressoDaMeta(90, '2027-01-24').porSemanaNecessario).toBe(10)
  })
})

describe('ritmoSemanal', () => {
  it('novos pagantes nos últimos 7 dias da série acumulada', () => {
    const serie = Array.from({ length: 10 }, (_, i) => ({ dia: `2026-10-${10 + i}`, acumulado: i < 5 ? 1 : 4 }))
    expect(ritmoSemanal(serie)).toBe(3)
    expect(ritmoSemanal([])).toBe(0)
    expect(ritmoSemanal([{ dia: '2026-10-28', acumulado: 2 }])).toBe(2)
  })
})

describe('funil', () => {
  const f = { cadastrou: 20, perfil_completo: 18, primeiro_aluno: 9, tres_alunos: 4, pagou: 2, mediana_horas_primeiro_aluno: 30, mediana_horas_tres_alunos: 100, mediana_dias_primeiro_pagamento: 6 }
  it('conversão sobre o início e sobre a etapa anterior', () => {
    const e = etapasDoFunil(f)
    expect(e.map((x) => x.pctDoInicio)).toEqual([100, 90, 45, 20, 10])
    expect(e.map((x) => x.pctDaAnterior)).toEqual([null, 90, 50, 44, 50])
    expect(e[2].legenda).toBe('mediana: 30 h após o cadastro')
    expect(e[4].legenda).toBe('mediana: 6 dias após o cadastro')
  })
  it('etapa com mais gente que a anterior não vira percentual acima de 100%', () => {
    const e = etapasDoFunil({ ...f, tres_alunos: 1, pagou: 2 })
    expect(e[4]).toMatchObject({ valor: 2, pctDoInicio: 10, pctDaAnterior: null, semPassarPelaAnterior: 1 })
    expect(e[3].semPassarPelaAnterior).toBe(0)
    expect(e.every((x) => x.pctDaAnterior === null || x.pctDaAnterior <= 100)).toBe(true)
  })
  it('o gargalo é a etapa com a pior passagem', () => {
    expect(maiorGargalo(etapasDoFunil(f))?.chave).toBe('tres_alunos')
  })
  it('poucos cadastros não geram gargalo (amostra pequena)', () => {
    expect(maiorGargalo(etapasDoFunil({ ...f, cadastrou: 3, perfil_completo: 2, primeiro_aluno: 1, tres_alunos: 0, pagou: 0 }))).toBeNull()
  })
  it('sem cadastros não divide por zero', () => {
    const e = etapasDoFunil({ cadastrou: 0, perfil_completo: 0, primeiro_aluno: 0, tres_alunos: 0, pagou: 0, mediana_horas_primeiro_aluno: null, mediana_horas_tres_alunos: null, mediana_dias_primeiro_pagamento: null })
    expect(e.every((x) => x.pctDoInicio === 0 && x.legenda === null)).toBe(true)
  })
  it('formata a mediana em horas ou dias', () => {
    expect(formatarMediana(0.4)).toBe('menos de 1 h')
    expect(formatarMediana(30)).toBe('30 h')
    expect(formatarMediana(72)).toBe('3 dias')
    expect(formatarMediana(null)).toBe('sem dados')
  })
})

describe('origem e custo por pagante', () => {
  it('conversão e custo', () => {
    expect(conversaoParaPagante({ cadastros: 40, ativados: 10, pagantes: 5 })).toBe(13)
    expect(conversaoParaPagante({ cadastros: 0, ativados: 0, pagantes: 0 })).toBeNull()
    expect(custoPorPagante(300, 4)).toBe(75)
    expect(custoPorPagante(300, 0)).toBeNull()
    expect(custoPorPagante(null, 3)).toBeNull()
    expect(custoPorPagante(-1, 3)).toBeNull()
  })
  it('lê o investimento em reais', () => {
    expect(lerInvestimento('300')).toBe(300)
    expect(lerInvestimento('1.250,50')).toBe(1250.5)
    expect(lerInvestimento('')).toBeNull()
    expect(lerInvestimento('abc')).toBeNull()
  })
  it('rótulos amigáveis para as origens conhecidas', () => {
    expect(rotuloOrigem('direto')).toBe('Direto / sem origem')
    expect(rotuloOrigem('newsletter')).toBe('newsletter')
  })
})

describe('lista de ação', () => {
  it('frases por motivo', () => {
    expect(detalheDoMotivo({ motivo: 'trial_sem_ativacao', dias: 2, qtd_alunos: 1 })).toBe('faltam 2 dias · 1 aluno')
    expect(detalheDoMotivo({ motivo: 'pagante_sem_uso', dias: 9, qtd_alunos: 0 })).toBe('sem atividade há 9 dias · 0 alunos')
    expect(detalheDoMotivo({ motivo: 'vencendo', dias: 1, qtd_alunos: 5 })).toBe('vence amanhã · 5 alunos')
    expect(detalheDoMotivo({ motivo: 'vencendo', dias: 0, qtd_alunos: 5 })).toBe('vence hoje · 5 alunos')
  })
  it('link do WhatsApp só com telefone válido', () => {
    expect(linkContatoPersonal('(21) 98652-1747')).toBe('https://wa.me/5521986521747')
    expect(linkContatoPersonal(null)).toBeNull()
    expect(linkContatoPersonal('123')).toBeNull()
  })
})

describe('normalizar', () => {
  it('JSON vazio vira zeros e listas vazias', () => {
    const d = normalizarBIv1(null)
    expect(d.funil.cadastrou).toBe(0)
    expect(d.meta.serie).toEqual([])
    expect(d.cidades).toEqual([])
    expect(normalizarListaAcao(null)).toEqual([])
  })
  it('números em texto viram número e a mediana ausente fica nula', () => {
    const d = normalizarBIv1({ meta: { pagantes_ativos: '3', mrr: '45.50', serie: [{ dia: '2026-10-28', acumulado: '3' }] }, funil: { cadastrou: '7', mediana_horas_primeiro_aluno: '12.5' }, cidades: [{ cidade: 'Curitiba/PR', cadastros: '4', ativados: '2', pagantes: '1' }] })
    expect(d.meta.pagantes_ativos).toBe(3)
    expect(d.meta.mrr).toBe(45.5)
    expect(d.funil.mediana_horas_primeiro_aluno).toBe(12.5)
    expect(d.funil.mediana_horas_tres_alunos).toBeNull()
    expect(d.cidades[0]).toEqual({ cidade: 'Curitiba/PR', cadastros: 4, ativados: 2, pagantes: 1 })
  })
})
