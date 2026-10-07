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
