import { describe, expect, it } from 'vitest'
import { abaDaUrl, cidadeDaUrl, descreverTreinos, filtrarPorCidade, linkMapsCidade, NAO_INFORMADO, ordenarPersonais, passaFiltroRapido, ROTULO_ACAO_ADMIN, rotuloCidade, situacaoDoPersonal, usoDoPersonal, type MetricasPersonal } from './personais'

describe('cidade do personal', () => {
  it('vazio vira "Não informado" e não gera link', () => {
    for (const v of [null, undefined, '', '   ']) {
      expect(rotuloCidade(v)).toBe(NAO_INFORMADO)
      expect(linkMapsCidade(v)).toBeNull()
    }
  })
  it('link do Maps codifica cidade/UF', () => {
    expect(rotuloCidade('Niterói/RJ')).toBe('Niterói/RJ')
    expect(linkMapsCidade('Niterói/RJ')).toBe('https://www.google.com/maps/search/?api=1&query=Niter%C3%B3i%2FRJ%2C%20Brasil')
  })
})

describe('descreverTreinos', () => {
  it('sem métricas: "Não informado"', () => {
    expect(descreverTreinos(undefined).montados).toBe(NAO_INFORMADO)
  })
  it('soma e separa presencial x à distância; zero é zero, não "não informado"', () => {
    const d = descreverTreinos({ treinos_presencial: 3, treinos_distancia: 2, exec_presencial: 9, exec_distancia: 0, exec_30d: 4 })
    expect(d.montados).toBe('5 (3 presencial · 2 à distância)')
    expect(d.realizados).toBe('9 (9 presencial · 0 à distância)')
    expect(d.ultimos30).toBe('4')
  })
})

describe('abas do admin', () => {
  it('aba da URL: válida passa, desconhecida ou ausente vira "geral"', () => {
    expect(abaDaUrl('suporte')).toBe('suporte')
    expect(abaDaUrl('xyz')).toBe('geral')
    expect(abaDaUrl(null)).toBe('geral')
  })
  it('toda ação registrada no banco tem rótulo', () => {
    for (const a of ['reset_senha', 'alterar_trial', 'alterar_plano', 'alterar_cpf']) expect(ROTULO_ACAO_ADMIN[a]).toBeTruthy()
  })
})

describe('cidade como filtro da lista de personais', () => {
  const lista = [
    { id: 'a', cidade: 'Curitiba/PR' },
    { id: 'b', cidade: 'Rio de Janeiro/RJ' },
    { id: 'c', cidade: 'Curitiba/PR' },
    { id: 'd', cidade: null },
    { id: 'e', cidade: '  ' },
  ]
  it('sem cidade devolve todos', () => {
    expect(filtrarPorCidade(lista, '')).toHaveLength(5)
    expect(filtrarPorCidade(lista, '   ')).toHaveLength(5)
  })
  it('filtra pela cidade exata', () => {
    expect(filtrarPorCidade(lista, 'Curitiba/PR').map((p) => p.id)).toEqual(['a', 'c'])
    expect(filtrarPorCidade(lista, 'Salvador/BA')).toEqual([])
  })
  it('"Não informado" pega quem não cadastrou cidade', () => {
    expect(filtrarPorCidade(lista, NAO_INFORMADO).map((p) => p.id)).toEqual(['d', 'e'])
  })
  it('cidadeDaUrl limpa espaços e aceita ausência', () => {
    expect(cidadeDaUrl(' Curitiba/PR ')).toBe('Curitiba/PR')
    expect(cidadeDaUrl(null)).toBe('')
  })
})


describe('situação comercial', () => {
  const agora = new Date('2026-10-28T15:00:00Z')
  const base = { qtd_alunos: 0, trial_fim: null as string | null, assinatura_fim: null as string | null }
  it('trial: próximo evento e urgência pelo prazo', () => {
    expect(situacaoDoPersonal({ ...base, status: 'trial', trial_fim: '2026-10-29T15:00:00Z' }, null, agora)).toEqual({ rotulo: 'Em trial', evento: 'Trial termina amanhã', urgencia: 'alta' })
    expect(situacaoDoPersonal({ ...base, status: 'trial', trial_fim: '2026-11-04T15:00:00Z' }, null, agora)).toMatchObject({ evento: 'Trial termina em 7 dias', urgencia: 'media' })
    expect(situacaoDoPersonal({ ...base, status: 'trial', trial_fim: '2027-03-01T15:00:00Z' }, null, agora).urgencia).toBe('nenhuma')
    expect(situacaoDoPersonal({ ...base, status: 'trial', trial_fim: '2026-10-28T20:00:00Z' }, null, agora).evento).toBe('Trial termina hoje')
  })
  it('pagante, vencido, cancelado e sem assinatura', () => {
    expect(situacaoDoPersonal({ ...base, status: 'ativa', assinatura_fim: '2026-11-20T15:00:00Z' }, null, agora)).toEqual({ rotulo: 'Pagante', evento: 'Plano vence em 23 dias', urgencia: 'nenhuma' })
    expect(situacaoDoPersonal({ ...base, status: 'ativa' }, null, agora).evento).toBe('Plano sem data de vencimento')
    expect(situacaoDoPersonal({ ...base, status: 'expirada', trial_fim: '2026-10-25T15:00:00Z' }, null, agora)).toEqual({ rotulo: 'Vencido', evento: 'Venceu há 3 dias', urgencia: 'alta' })
    expect(situacaoDoPersonal({ ...base, status: 'cancelada' }, null, agora).rotulo).toBe('Cancelado')
    expect(situacaoDoPersonal({ ...base, status: null }, null, agora).rotulo).toBe('Sem assinatura')
  })
  it('mês grátis estende o prazo mostrado', () => {
    expect(situacaoDoPersonal({ ...base, status: 'trial', trial_fim: '2026-10-29T15:00:00Z' }, '2026-11-28T15:00:00Z', agora).evento).toBe('Trial termina em 31 dias')
  })
})

describe('uso recente e filtros rápidos', () => {
  const agora = new Date('2026-10-28T15:00:00Z')
  const m = (exec_30d: number): MetricasPersonal => ({ treinos_presencial: 3, treinos_distancia: 1, exec_presencial: 5, exec_distancia: 2, exec_30d })
  const pers = (o: Partial<{ id: string; name: string; status: string; trial_fim: string | null; assinatura_fim: string | null; qtd_alunos: number }> = {}) => ({ id: 'a', name: 'Ana', status: 'trial', trial_fim: '2026-11-30T15:00:00Z', assinatura_fim: null, qtd_alunos: 2, ...o })

  it('uso: destaque nos 30 dias e totais em segundo plano', () => {
    expect(usoDoPersonal(m(4))).toMatchObject({ principal: '4 treinos em 30 dias', secundario: '4 montados · 7 realizados', semUso: false })
    expect(usoDoPersonal(m(1)).principal).toBe('1 treino em 30 dias')
    expect(usoDoPersonal(m(0))).toMatchObject({ principal: 'Sem treinos em 30 dias', semUso: true })
    expect(usoDoPersonal(undefined).principal).toBe(NAO_INFORMADO)
  })
  it('filtros: trial acabando, sem uso, sem alunos e vencidos', () => {
    expect(passaFiltroRapido('trial_acabando', pers({ trial_fim: '2026-10-30T15:00:00Z' }), null, undefined, agora)).toBe(true)
    expect(passaFiltroRapido('trial_acabando', pers(), null, undefined, agora)).toBe(false)
    expect(passaFiltroRapido('trial_acabando', pers({ status: 'ativa', assinatura_fim: '2026-10-30T15:00:00Z' }), null, undefined, agora)).toBe(false)
    expect(passaFiltroRapido('sem_uso', pers(), null, m(0), agora)).toBe(true)
    expect(passaFiltroRapido('sem_uso', pers(), null, m(2), agora)).toBe(false)
    expect(passaFiltroRapido('sem_uso', pers(), null, undefined, agora)).toBe(false)
    expect(passaFiltroRapido('sem_uso', pers({ status: 'expirada' }), null, m(0), agora)).toBe(false)
    expect(passaFiltroRapido('sem_alunos', pers({ qtd_alunos: 0 }), null, undefined, agora)).toBe(true)
    expect(passaFiltroRapido('vencidos', pers({ status: 'expirada' }), null, undefined, agora)).toBe(true)
  })
  it('ordenação por nome, fim do acesso e menor uso, sem alterar a lista original', () => {
    const lista = [
      pers({ id: '1', name: 'Zeca', trial_fim: '2026-11-01T15:00:00Z' }),
      pers({ id: '2', name: 'Bia', trial_fim: '2026-12-01T15:00:00Z' }),
      pers({ id: '3', name: 'Caio', trial_fim: null }),
    ]
    const ids = (l: { id: string }[]) => l.map((x) => x.id)
    expect(ids(ordenarPersonais(lista, 'nome', undefined, undefined))).toEqual(['2', '3', '1'])
    expect(ids(ordenarPersonais(lista, 'vence_primeiro', undefined, undefined))).toEqual(['1', '2', '3'])
    const met = new Map([['1', m(5)], ['2', m(0)]])
    expect(ids(ordenarPersonais(lista, 'menos_uso', undefined, met))).toEqual(['2', '1', '3'])
    expect(ids(lista)).toEqual(['1', '2', '3'])
  })
  it('ordenação por mais tempo sem usar: quem nunca usou primeiro, depois o uso mais antigo, sem dado no fim', () => {
    const lista = [pers({ id: '1', name: 'A' }), pers({ id: '2', name: 'B' }), pers({ id: '3', name: 'C' }), pers({ id: '4', name: 'D' })]
    const at = new Map<string, string | null>([['1', '2026-10-27T00:00:00Z'], ['2', '2026-10-01T00:00:00Z'], ['3', null]])
    expect(ordenarPersonais(lista, 'sem_atividade', undefined, undefined, at).map((x) => x.id)).toEqual(['3', '2', '1', '4'])
  })
})
