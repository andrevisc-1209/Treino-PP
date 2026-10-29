import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { cartoesDestaque, dimensoesDoPng, linhaComplementar, type DadosRelatorio } from './relatorio'
import { assiduidade, notaMedia, type ItemRecibo } from './recibo'
import { ehTextoVazio, textoDoPersonal, avaliacaoDaFatura } from './avaliacao'
import { volumeZero } from '@/features/execucoes/volume'

const item = (p: Partial<ItemRecibo> & { id: string; starts_at: string }): ItemRecibo => ({ status: 'presente', valor: null, duration_min: 60, local: null, modalidade: null, pse: null, nota: null, data_sessao: null, ...p })
const vol = (p: Partial<ReturnType<typeof volumeZero>>) => ({ ...volumeZero(), ...p })
const base = (itens: ItemRecibo[], extra: Partial<DadosRelatorio> = {}): DadosRelatorio => ({ alunoNome: 'Paulo', personalNome: 'André', periodoInicio: '2026-10-01', periodoFim: '2026-10-31', modelo: 'por_aula', itens, ajuste: 0, ajusteDescricao: null, total: 200, geradoEm: '2026-10-28', ...extra })

describe('cartões de destaque', () => {
  const paulo = [
    item({ id: '1', starts_at: '2026-10-23T15:00:00Z', modalidade: 'musculacao', series_feitas: 14, exercicios_feitos: 5 }),
    item({ id: '2', starts_at: '2026-10-26T15:00:00Z', modalidade: 'natacao', volume: vol({ natacaoKm: 5.2 }) }),
    item({ id: '3', starts_at: '2026-10-27T15:00:00Z', modalidade: 'musculacao', series_feitas: 13, exercicios_feitos: 5 }),
    item({ id: '4', starts_at: '2026-10-28T15:00:00Z', modalidade: 'natacao', volume: vol({ natacaoKm: 5.3 }) }),
  ]
  it('aulas + um cartão por modalidade com o número grande', () => {
    expect(cartoesDestaque(base(paulo))).toEqual([
      { valor: '4', rotulo: 'Aulas realizadas' },
      { valor: '27 séries', rotulo: 'Musculação · 2 treinos' },
      { valor: '10,5 km', rotulo: 'Natação · 2 treinos' },
    ])
  })
  it('modalidade sem número mostra só os treinos; no máximo 4 cartões', () => {
    const muitas = ['corrida', 'ciclismo', 'brick', 'natacao', 'musculacao'].map((m, i) => item({ id: String(i), starts_at: `2026-10-0${i + 1}T15:00:00Z`, modalidade: m }))
    const c = cartoesDestaque(base(muitas))
    expect(c).toHaveLength(4)
    expect(c[1].valor).toBe('1')
  })
  it('pacote mostra "X de N"', () => {
    expect(cartoesDestaque(base(paulo, { modelo: 'pacote', aulasContratadas: 10 }))[0]).toEqual({ valor: '4 de 10', rotulo: 'Aulas do pacote' })
  })
  it('falta cobrada entra na assiduidade; falta não cobrada não', () => {
    const itens = [...paulo, item({ id: 'f', starts_at: '2026-10-29T15:00:00Z', status: 'falta', cobrar: true })]
    expect(assiduidade(itens)).toEqual({ realizadas: 4, previstas: 5, faltasCobradas: 1 })
    expect(cartoesDestaque(base(itens))[0]).toEqual({ valor: '4 de 5', rotulo: 'Aulas realizadas · 1 falta cobrada' })
    expect(assiduidade([...paulo, item({ id: 'f', starts_at: '2026-10-29T15:00:00Z', status: 'falta', cobrar: false })])).toBeNull()
    expect(assiduidade(paulo)).toBeNull()
  })
})

describe('linha complementar', () => {
  it('só o que é complementar e relevante: exercícios, séries, nota média; "dias treinados" some quando igual às aulas', () => {
    const itens = [
      item({ id: '1', starts_at: '2026-10-23T15:00:00Z', modalidade: 'musculacao', series_feitas: 14, exercicios_feitos: 5, nota: 10, data_sessao: '2026-10-23' }),
      item({ id: '2', starts_at: '2026-10-27T15:00:00Z', modalidade: 'musculacao', series_feitas: 13, exercicios_feitos: 5, nota: 8, data_sessao: '2026-10-27' }),
    ]
    expect(linhaComplementar(base(itens))).toBe('10 exercícios · 27 séries · Nota média do personal 9 (2 treinos)')
  })
  it('com 5 treinos avaliados a média sai da linha (aparece o gráfico)', () => {
    const itens = Array.from({ length: 5 }, (_, i) => item({ id: String(i), starts_at: `2026-10-0${i + 1}T15:00:00Z`, nota: 8, data_sessao: `2026-10-0${i + 1}` }))
    expect(linhaComplementar(base(itens))).not.toContain('Nota média')
    expect(notaMedia(itens)).toEqual({ media: 8, treinos: 5 })
  })
  it('treino à distância e vários dias treinados', () => {
    const itens = [
      item({ id: '1', starts_at: '2026-10-05T15:00:00Z' }),
      item({ id: '2', starts_at: '2026-10-05T18:00:00Z' }),
      item({ id: '3', starts_at: '2026-10-06T15:00:00Z', a_distancia: true, fora_da_cobranca: true }),
    ]
    expect(linhaComplementar(base(itens))).toBe('1 dia treinado · 1 treino à distância')
  })
})

describe('texto do personal', () => {
  it('"nada", "nenhum" e parecidos viram vazio e o bloco não aparece', () => {
    for (const t of ['nada', ' Nada. ', 'Nenhum', 'nenhuma!', '-', 'n/a', 'Não', '', null]) expect(ehTextoVazio(t)).toBe(true)
    expect(ehTextoVazio('Nada a reclamar, ótima evolução')).toBe(false)
    expect(avaliacaoDaFatura({ avaliacao_conquistas: 'ótima constância', avaliacao_atencao: 'nada', avaliacao_proximos: 'correr 10 km' })).toEqual({ conquistas: 'Ótima constância', atencao: null, proximos: 'Correr 10 km' })
    expect(avaliacaoDaFatura({ avaliacao_atencao: 'nada', avaliacao_conquistas: ' nenhum ' })).toBeNull()
  })
  it('só a primeira letra vira maiúscula; o resto fica como o personal escreveu', () => {
    expect(textoDoPersonal('irado 10 km nadando')).toBe('Irado 10 km nadando')
    expect(textoDoPersonal('  ótimo, só falta alongar ')).toBe('Ótimo, só falta alongar')
  })
})

describe('logo', () => {
  it('lê a largura e a altura do PNG', () => {
    const png = 'data:image/png;base64,' + readFileSync('src/assets/brand/logo-personal-perto.png').toString('base64')
    expect(dimensoesDoPng(png)).toEqual({ w: 1485, h: 565 })
    expect(dimensoesDoPng('data:image/png;base64,AAAA')).toBeNull()
  })
})
