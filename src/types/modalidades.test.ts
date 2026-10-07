import { describe, expect, it } from 'vitest'
import { gerarMensagemTreino } from '@/lib/mensagemTreino'
import { linkWhatsAppComTexto } from '@/lib/whatsapp'
import { ehModalidade, linhasDetalhes, MODALIDADES, montarDetalhes, resumoModalidade, valoresDoFormulario } from './modalidades'

describe('modalidades', () => {
  it('tem as 12 modalidades do enum do banco', () => {
    expect(MODALIDADES).toHaveLength(12)
    expect(ehModalidade('corrida')).toBe(true)
    expect(ehModalidade('golfe')).toBe(false)
  })
  it('monta detalhes: só campos da modalidade, sem vazios, números como número, select validado', () => {
    expect(montarDetalhes('pilates', { duracao_min: '45,5', nivel: 'avançado', observacoes: '', lixo: 'x' })).toEqual({ duracao_min: 45.5, nivel: 'avançado' })
    expect(montarDetalhes('pilates', { nivel: 'lua' })).toEqual({})
    expect(montarDetalhes('musculacao', { duracao_min: '5' })).toEqual({})
    expect(montarDetalhes('escalada', { tipo: 'boulder', nivel_via: ' V4 ' })).toEqual({ tipo: 'boulder', nivel_via: 'V4' })
  })
  it('resumo para o card', () => {
    expect(resumoModalidade('corrida', { distancia_km: 5, pace_alvo: '5:30' })).toBe('5 km · pace 5:30/km')
    expect(resumoModalidade('natacao', { distancia_m: 1000, tiros: 10, estilo: 'crawl' })).toBe('1.000 m · 10 tiros · crawl')
    expect(resumoModalidade('funcional', { rounds: 5, duracao_min: 40 })).toBe('5 rounds · 40 min')
    expect(resumoModalidade('yoga', { duracao_min: 60, estilo: 'hatha' })).toBe('60 min · hatha')
    expect(resumoModalidade('corrida', {})).toBeNull()
    expect(resumoModalidade('musculacao', { x: 1 })).toBeNull()
  })
  it('detalhes e formulário ida e volta', () => {
    expect(valoresDoFormulario({ duracao_min: 5, nivel: 'iniciante' })).toEqual({ duracao_min: '5', nivel: 'iniciante' })
    expect(linhasDetalhes('pilates', { duracao_min: 5, nivel: 'iniciante' })).toEqual(['• Duração (min): 5', '• Nível: iniciante'])
  })
  it('mensagem do treino assíncrono e link do WhatsApp', () => {
    const m = gerarMensagemTreino({
      nomeAluno: 'Ana Souza',
      nomePersonal: 'Bia',
      nomeTreino: 'Longão',
      modalidade: 'corrida',
      detalhes: { blocos: [{ id: 'a', nome: 'Aquecimento', descricao: 'trote leve', duracao: '10min' }, { id: 'b', nome: 'Tiros', descricao: '6x400 m', distancia: 2400, intensidade: 'forte' }] },
    })
    expect(m).toContain('Olá, Ana! 💪')
    expect(m).toContain('"Longão" de 🏃 Corrida')
    expect(m).toContain('1. Aquecimento — trote leve · 10min')
    expect(m).toContain('2. Tiros — 6x400 m · 2.400 m · forte')
    expect(m).toContain('— Bia')
    const musc = gerarMensagemTreino({ nomeAluno: 'Ana', nomePersonal: 'Bia', nomeTreino: 'A', modalidade: 'musculacao', detalhes: {}, exercicios: [{ nome: 'Supino', series: 3, repeticoes: '10' }] })
    expect(musc).toContain('1. Supino — 3x10')
    expect(musc).not.toContain('Detalhes')
    expect(linkWhatsAppComTexto('(21) 98652-1747', 'oi')).toBe('https://wa.me/5521986521747?text=oi')
    expect(linkWhatsAppComTexto(null, 'a b')).toBe('https://wa.me/?text=a%20b')
  })
})

import { exerciciosLivresDe, descreverExecucao } from './modalidades'
import { detalhesDoResultado } from '@/features/execucoes/resultado'

describe('exercícios livres e execução', () => {
  it('guarda exercícios livres só fora da musculação, sem itens vazios', () => {
    expect(montarDetalhes('yoga', { duracao_min: '40' }, [{ nome: ' Saudação ao sol ', descricao: ' 5 ciclos ' }, { nome: '  ' }, { nome: 'Respiração' }])).toEqual({
      duracao_min: 40,
      exercicios_livres: [{ nome: 'Saudação ao sol', descricao: '5 ciclos' }, { nome: 'Respiração' }],
    })
    expect(montarDetalhes('musculacao', {}, [{ nome: 'x' }])).toEqual({})
  })
  it('lê exercícios livres (e o texto antigo da Fase 1, uma linha por item)', () => {
    expect(exerciciosLivresDe({ exercicios_livres: [{ nome: 'A' }, { nome: '' }] })).toEqual([{ nome: 'A', descricao: undefined }])
    expect(exerciciosLivresDe({ exercicios_livres: 'Agachar\n\nSaltar' })).toEqual([{ nome: 'Agachar' }, { nome: 'Saltar' }])
    expect(exerciciosLivresDe({})).toEqual([])
    expect(valoresDoFormulario({ rounds: 5, exercicios_livres: [{ nome: 'A' }] })).toEqual({ rounds: '5' })
  })
  it('monta e descreve o resultado do aluno', () => {
    const detalhes = { blocos: [{ id: '1', nome: 'Alongar', descricao: '5 min' }, { id: '2', nome: 'Correr', descricao: '5 km' }] }
    const d = detalhesDoResultado('corrida', detalhes, { valores: { distancia_km: '5,2', tempo_total: '28:30', pace_medio: '' }, feitos: [true], notas: '' })
    expect(d).toEqual({ resultado: { distancia_km: 5.2, tempo_total: '28:30' }, exercicios_livres: [{ nome: 'Alongar', feito: true }, { nome: 'Correr', feito: false }] })
    expect(descreverExecucao('corrida', d)).toEqual(['Distância feita (km): 5,2', 'Tempo total: 28:30', '✔ Alongar', '✘ Correr'])
    expect(
      descreverExecucao('musculacao', { exercicios: [{ exercicio_id: 'e', nome: 'Supino', series_planejadas: 3, series_feitas: 2, obs: 'pesado' }] }),
    ).toEqual(['Supino: 2/3 séries — pesado'])
  })
})


import { blocosDe, formatarBloco, itensChecklist, resumoModalidade as resumo, usaBlocos, validarBlocos } from './modalidades'

describe('blocos de treino', () => {
  const natacao = [
    { id: '1', nome: 'Aquecimento', descricao: '400m livre' },
    { id: '2', nome: 'Perna com pé de pato', descricao: '50 crawl / 50 costas', distancia: 800, intensidade: 'moderado' },
    { id: '3', nome: 'Soltura', descricao: '500m livre' },
  ]
  it('só endurance usa blocos', () => {
    expect(['natacao', 'corrida', 'ciclismo', 'remo', 'funcional'].every((m) => usaBlocos(m as never))).toBe(true)
    expect(['musculacao', 'yoga', 'pilates', 'boxe', 'futebol', 'futevolei', 'escalada'].some((m) => usaBlocos(m as never))).toBe(false)
  })
  it('monta os blocos: limpa vazios, mantém a ordem, descarta sem nome/descrição e ignora exercícios livres', () => {
    const d = montarDetalhes('natacao', { observacoes: ' sem pernada ' }, [{ nome: 'x' }], [
      ...natacao,
      { id: '4', nome: '', descricao: 'sem nome' },
      { id: '5', nome: 'Série', descricao: '  ', observacoes: 'x' },
    ])
    expect((d.blocos as { nome: string }[]).map((b) => b.nome)).toEqual(['Aquecimento', 'Perna com pé de pato', 'Soltura'])
    expect(d.exercicios_livres).toBeUndefined()
    expect(d.observacoes).toBe('sem pernada')
    expect(montarDetalhes('musculacao', {}, [], natacao)).toEqual({})
    expect(montarDetalhes('yoga', {}, [], natacao).blocos).toBeUndefined()
  })
  it('validação: ao menos 1 bloco, todos com nome e descrição', () => {
    expect(validarBlocos('natacao', [])).toMatch(/ao menos um bloco/)
    expect(validarBlocos('natacao', [{ id: 'a', nome: 'A', descricao: '' }])).toMatch(/nome e a descrição/)
    expect(validarBlocos('natacao', natacao)).toBeNull()
    expect(validarBlocos('yoga', [])).toBeNull()
  })
  it('exibição numerada e resumo', () => {
    expect(formatarBloco(natacao[1] as never)).toBe('Perna com pé de pato — 50 crawl / 50 costas · 800 m · moderado')
    expect(resumo('natacao', { blocos: natacao })).toBe('3 blocos · 800 m')
    expect(itensChecklist('natacao', { blocos: natacao }).map((i) => i.nome)).toEqual(['Aquecimento', 'Perna com pé de pato', 'Soltura'])
  })
  it('treino antigo (campos únicos) aparece como um bloco', () => {
    const antigo = { distancia_km: 5, pace_alvo: '5:30' }
    expect(blocosDe('corrida', antigo)).toEqual([{ id: 'legado', nome: 'Treino', descricao: '5 km · pace 5:30/km' }])
    expect(resumo('corrida', antigo)).toBe('5 km · pace 5:30/km')
    expect(blocosDe('musculacao', antigo)).toEqual([])
  })
})
