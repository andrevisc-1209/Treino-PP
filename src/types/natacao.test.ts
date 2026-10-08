import { describe, expect, it } from 'vitest'
import { EXERCICIOS_NATACAO, serveAoAmbiente } from '@/data/natacao-exercicios'
import { TEMPLATES_NATACAO } from '@/data/natacao-templates'
import { gerarMensagemTreino } from '@/lib/mensagemTreino'
import { blocosDe, itensChecklist, montarDetalhes, resumoModalidade, textoLegadoNatacao, validarBlocos } from './modalidades'
import {
  dadosNatacaoDe,
  descricaoBlocoNatacao,
  distanciaTotalNatacao,
  formatarTempo,
  montarDetalhesNatacao,
  natacaoInicial,
  resumoTotalNatacao,
  tempoTotalNatacao,
  validarNatacao,
  type DadosNatacao,
} from './natacao'

const bloco = (id: string, nome: string, parametros: DadosNatacao['blocos'][number]['parametros']) => ({ id, exercicio_id: id, nome, parametros })
const piscina: DadosNatacao = {
  ambiente: 'piscina',
  blocos: [
    bloco('crawl', 'Crawl (Livre)', { distancia: 400, series: 1, descanso: 30 }),
    bloco('boia-palmar', 'Boia + Palmar', { distancia: 100, series: 6, descanso: 25, observacao: 'foco na tração' }),
    bloco('costas', 'Costas', { distancia: 200, series: 1, descanso: 0 }),
  ],
}

describe('biblioteca e templates', () => {
  it('ids únicos e parâmetro principal coerente', () => {
    const ids = EXERCICIOS_NATACAO.map((e) => e.id)
    expect(new Set(ids).size).toBe(ids.length)
    for (const e of EXERCICIOS_NATACAO) {
      expect(e.chipsSugestao?.length).toBeGreaterThan(0)
      if (e.grupo === 'mar') expect(e.parametroPrincipal).toBe('tempo')
    }
  })
  it('todo exercício dos modelos existe na biblioteca, serve ao ambiente e usa o parâmetro certo', () => {
    for (const t of TEMPLATES_NATACAO) {
      expect(t.blocos.length).toBeGreaterThan(0)
      for (const b of t.blocos) {
        const e = EXERCICIOS_NATACAO.find((x) => x.id === b.exercicio_id)
        expect(e, `${t.id}: exercício ${b.exercicio_id} não existe`).toBeDefined()
        expect(serveAoAmbiente(e!, t.ambiente), `${t.id}: ${e!.id} não serve ao ambiente`).toBe(true)
        expect(b.parametros[e!.parametroPrincipal], `${t.id}: ${e!.id} sem ${e!.parametroPrincipal}`).toBeGreaterThan(0)
        expect(validarNatacao({ ambiente: t.ambiente, blocos: [{ ...b, id: 'x' }] })).toBeNull()
      }
    }
  })
  it('exercício "ambos" serve aos dois; os de mar não servem à piscina', () => {
    expect(serveAoAmbiente(EXERCICIOS_NATACAO.find((e) => e.id === 'head-up')!, 'mar')).toBe(true)
    expect(serveAoAmbiente(EXERCICIOS_NATACAO.find((e) => e.id === 'mar-crawl')!, 'piscina')).toBe(false)
    expect(serveAoAmbiente(EXERCICIOS_NATACAO.find((e) => e.id === 'crawl')!, 'mar')).toBe(false)
  })
})

describe('natação: totais e descrição', () => {
  it('soma distância × séries; tempo do mar inclui descansos entre séries', () => {
    expect(distanciaTotalNatacao(piscina.blocos)).toBe(400 + 600 + 200)
    expect(resumoTotalNatacao(piscina)).toBe('Distância total: 1.200 m')
    const mar: DadosNatacao = { ambiente: 'mar', blocos: [bloco('mar-crawl', 'Crawl em Mar Aberto', { tempo: 600, series: 2, descanso: 120 })] }
    expect(tempoTotalNatacao(mar.blocos)).toBe(1320)
    expect(resumoTotalNatacao(mar)).toBe('Tempo estimado: 22min')
  })
  it('tempo legível', () => {
    expect([45, 1800, 5400, 90, 3600].map(formatarTempo)).toEqual(['45s', '30min', '1h30', '1min30s', '1h'])
  })
  it('descrição do bloco', () => {
    expect(descricaoBlocoNatacao(piscina.blocos[1])).toBe('100 m · 6 séries · 25s descanso')
    expect(descricaoBlocoNatacao(piscina.blocos[0])).toBe('400 m · 1 série')
  })
})

describe('natação: salvar e validar', () => {
  it('grava ambiente + blocos limpos e relê', () => {
    const d = montarDetalhes('natacao', { observacoes: ' sem pernada ' }, [], [], { ...piscina, blocos: [{ ...piscina.blocos[1], parametros: { ...piscina.blocos[1].parametros, ritmo: '  ' } }] })
    expect(d.ambiente).toBe('piscina')
    expect(d.observacoes).toBe('sem pernada')
    const lido = dadosNatacaoDe(d)
    expect(lido?.blocos[0].parametros).toEqual({ distancia: 100, series: 6, descanso: 25, observacao: 'foco na tração' })
    expect(montarDetalhesNatacao(piscina).blocos).toHaveLength(3)
  })
  it('validação: mínimo 1 exercício, distância/tempo > 0, séries 1–20', () => {
    expect(validarNatacao({ ambiente: 'piscina', blocos: [] })).toMatch(/ao menos um exercício/)
    expect(validarNatacao({ ambiente: 'piscina', blocos: [bloco('a', 'A', { series: 1, descanso: 0 })] })).toMatch(/distância/)
    expect(validarNatacao({ ambiente: 'mar', blocos: [bloco('a', 'A', { tempo: 0, series: 1, descanso: 0 })] })).toMatch(/tempo/)
    expect(validarNatacao({ ambiente: 'piscina', blocos: [bloco('a', 'A', { distancia: 50, series: 21, descanso: 0 })] })).toMatch(/1 a 20/)
    expect(validarNatacao(piscina)).toBeNull()
    expect(validarBlocos('natacao', [], piscina)).toBeNull()
    expect(validarBlocos('natacao', [], { ambiente: 'piscina', blocos: [] })).toMatch(/ao menos/)
  })
})

describe('natação: exibição, checklist e mensagem', () => {
  const detalhes = montarDetalhesNatacao(piscina) as Record<string, never>
  it('cada exercício vira bloco/item de checklist; resumo para o card', () => {
    expect(blocosDe('natacao', detalhes).map((b) => b.nome)).toEqual(['Crawl (Livre)', 'Boia + Palmar', 'Costas'])
    expect(itensChecklist('natacao', detalhes)[1]).toEqual({ nome: 'Boia + Palmar', descricao: '100 m · 6 séries · 25s descanso · “foco na tração”' })
    expect(resumoModalidade('natacao', detalhes)).toBe('Piscina · 3 exercícios · 1.200 m')
  })
  it('WhatsApp traz ambiente, total e a lista', () => {
    const m = gerarMensagemTreino({ nomeAluno: 'Ana', nomePersonal: 'Bia', nomeTreino: 'Natação A', modalidade: 'natacao', detalhes })
    expect(m).toContain('🏊 Piscina · Distância total: 1.200 m')
    expect(m).toContain('2. Boia + Palmar — 100 m · 6 séries · 25s descanso')
  })
  it('treino no formato antigo: não vira estruturado, aparece como texto para refazer', () => {
    const antigo = { blocos: [{ id: '1', nome: 'Aquecimento', descricao: '400m livre' }] }
    expect(dadosNatacaoDe(antigo)).toBeNull()
    expect(natacaoInicial(antigo)).toEqual({ ambiente: 'piscina', blocos: [] })
    expect(textoLegadoNatacao(antigo)).toEqual(['Aquecimento — 400m livre'])
    expect(textoLegadoNatacao(detalhes)).toEqual([])
    expect(natacaoInicial({ ambiente: 'mar' }).ambiente).toBe('mar')
  })
})
