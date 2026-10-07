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
    expect(montarDetalhes('corrida', { distancia_km: '5,5', pace_alvo: ' 5:30 ', terreno: 'asfalto', observacoes: '', lixo: 'x' })).toEqual({
      distancia_km: 5.5,
      pace_alvo: '5:30',
      terreno: 'asfalto',
    })
    expect(montarDetalhes('corrida', { terreno: 'lua' })).toEqual({})
    expect(montarDetalhes('musculacao', { distancia_km: '5' })).toEqual({})
    expect(montarDetalhes('natacao', { tiros: 'abc', distancia_m: '-3' })).toEqual({})
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
    expect(valoresDoFormulario({ distancia_km: 5, pace_alvo: '5:30' })).toEqual({ distancia_km: '5', pace_alvo: '5:30' })
    expect(linhasDetalhes('corrida', { distancia_km: 5, terreno: 'trilha' })).toEqual(['• Distância (km): 5', '• Terreno: trilha'])
  })
  it('mensagem do treino assíncrono e link do WhatsApp', () => {
    const m = gerarMensagemTreino({
      nomeAluno: 'Ana Souza',
      nomePersonal: 'Bia',
      nomeTreino: 'Longão',
      modalidade: 'corrida',
      detalhes: { distancia_km: 10, pace_alvo: '6:00' },
    })
    expect(m).toContain('Olá, Ana! 💪')
    expect(m).toContain('"Longão" de 🏃 Corrida')
    expect(m).toContain('• Distância (km): 10')
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
    expect(montarDetalhes('funcional', { rounds: '5' }, [{ nome: ' Burpee ', descricao: ' 20 reps ' }, { nome: '  ' }, { nome: 'Prancha' }])).toEqual({
      rounds: 5,
      exercicios_livres: [{ nome: 'Burpee', descricao: '20 reps' }, { nome: 'Prancha' }],
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
    const detalhes = { exercicios_livres: [{ nome: 'Alongar' }, { nome: 'Correr' }] }
    const d = detalhesDoResultado('corrida', detalhes, { valores: { distancia_km: '5,2', tempo_total: '28:30', pace_medio: '' }, feitos: [true], notas: '' })
    expect(d).toEqual({ resultado: { distancia_km: 5.2, tempo_total: '28:30' }, exercicios_livres: [{ nome: 'Alongar', feito: true }, { nome: 'Correr', feito: false }] })
    expect(descreverExecucao('corrida', d)).toEqual(['Distância feita (km): 5,2', 'Tempo total: 28:30', '✔ Alongar', '✘ Correr'])
    expect(
      descreverExecucao('musculacao', { exercicios: [{ exercicio_id: 'e', nome: 'Supino', series_planejadas: 3, series_feitas: 2, obs: 'pesado' }] }),
    ).toEqual(['Supino: 2/3 séries — pesado'])
  })
})
