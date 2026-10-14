import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import {
  dadosRelatorioDeFatura,
  formatarDuracao,
  gerarRelatorioCompleto,
  linhasDaTabela,
  nomeArquivoRelatorio,
  resumoTotalRelatorio,
  rotuloAulaCiclo,
  rotuloModalidade,
  textoAjuste,
  tilesResumo,
  tilesTreino,
  type DadosRelatorio,
} from './relatorio'
import type { ItemRecibo } from './recibo'

const norm = (s: string) => s.replace(/\s/g, ' ')

const item = (p: Partial<ItemRecibo> & { id: string; starts_at: string }): ItemRecibo => ({
  status: 'presente',
  valor: 100,
  duration_min: 60,
  local: null,
  modalidade: null,
  pse: null,
  nota: null,
  data_sessao: null,
  ...p,
})

const dados: DadosRelatorio = {
  alunoNome: 'André Scherer',
  personalNome: 'Carla Souza',
  periodoInicio: '2026-09-15',
  periodoFim: '2026-10-14',
  modelo: 'por_aula',
  itens: [
    item({ id: 'b', starts_at: '2026-10-13T15:30:00Z', local: 'Academia X', modalidade: 'musculacao', nota: 8, data_sessao: '2026-10-13', exercicios_feitos: 5, series_feitas: 15, duracao_sessao_min: 60 }),
    item({ id: 'a', starts_at: '2026-10-06T15:30:00Z', nota: 6, data_sessao: '2026-10-06', exercicios_feitos: 4, series_feitas: 12, duracao_sessao_min: 50 }),
    item({ id: 'c', starts_at: '2026-10-08T15:30:00Z', status: 'falta', local: 'Academia X' }),
  ],
  ajuste: -20,
  ajusteDescricao: 'Desconto',
  total: 280,
  geradoEm: '2026-10-14',
}

describe('relatório completo do ciclo', () => {
  it('nome do arquivo: slug do aluno + mês/ano em que o ciclo termina', () => {
    expect(nomeArquivoRelatorio('André Scherer', '2026-10-14')).toBe('relatorio-andre-scherer-out-2026.pdf')
    expect(nomeArquivoRelatorio('  José  da Silva-Júnior ', '2027-01-09')).toBe('relatorio-jose-da-silva-junior-jan-2027.pdf')
    expect(nomeArquivoRelatorio('', '2026-12-01')).toBe('relatorio-aluno-dez-2026.pdf')
  })
  it('rótulo da aula e modalidade', () => {
    expect(rotuloAulaCiclo('2026-10-13T15:30:00Z', 60)).toBe('Ter, 13/10 · 12:30–13:30')
    expect(rotuloModalidade('natacao')).toBe('Natação')
    expect(rotuloModalidade(null)).toBeNull()
  })
  it('tabela cronológica; local e modalidade vazios (sem "-"); falta aparece no lugar da modalidade', () => {
    const t = linhasDaTabela(dados).map((l) => l.map(norm))
    expect(t[0]).toEqual(['Ter, 06/10', '12:30-13:30', '', '', 'R$ 100,00'])
    expect(t[1]).toEqual(['Qui, 08/10', '12:30-13:30', 'Falta', 'Academia X', 'R$ 100,00'])
    expect(t[2]).toEqual(['Ter, 13/10', '12:30-13:30', 'Musculação', 'Academia X', 'R$ 100,00'])
  })
  it('mensal não mostra valor por aula; total e ajuste', () => {
    expect(linhasDaTabela({ ...dados, modelo: 'mensal' }).every((l) => l[4] === '-')).toBe(true)
    expect(norm(resumoTotalRelatorio(dados))).toBe('3 aulas · Total: R$ 280,00')
    expect(norm(textoAjuste({ ajuste: -20, ajusteDescricao: 'Desconto' }))).toBe('Ajuste: Desconto — -R$ 20,00')
    expect(norm(textoAjuste({ ajuste: 15, ajusteDescricao: null }))).toBe('Ajuste — +R$ 15,00')
  })
  it('tiles de resumo: realizadas (só presentes), valor, dias, local', () => {
    const t = tilesResumo(dados).map((x) => [norm(x.valor), x.rotulo])
    expect(t).toEqual([['2', 'Aulas realizadas'], ['R$ 280,00', 'Valor total do ciclo'], ['2', 'Dias treinados'], ['Academia X', 'Local']])
    const varios = tilesResumo({ ...dados, itens: [...dados.itens, item({ id: 'd', starts_at: '2026-10-09T15:30:00Z', local: 'Praça' })] })
    expect(varios[3]).toEqual({ valor: '2', rotulo: 'Locais diferentes' })
    expect(tilesResumo({ ...dados, itens: [item({ id: 'z', starts_at: '2026-10-09T15:30:00Z' })] })[3]).toEqual({ valor: '—', rotulo: 'Local' })
  })
  it('métricas de treino: somadas quando existem; seção omitida quando não há dado', () => {
    expect(tilesTreino(dados).map((x) => [x.valor, x.rotulo])).toEqual([['9', 'Exercícios realizados'], ['27', 'Séries executadas'], ['1 h 50 min', 'Tempo de treino']])
    expect(tilesTreino({ ...dados, itens: [item({ id: 'x', starts_at: '2026-10-09T15:30:00Z' })] })).toEqual([])
    expect(tilesTreino({ ...dados, itens: [item({ id: 'x', starts_at: '2026-10-09T15:30:00Z', series_feitas: 3, exercicios_feitos: 1 })] }).map((x) => x.rotulo)).toEqual(['Exercício realizado', 'Séries executadas'])
  })
  it('duração legível', () => {
    expect(formatarDuracao(45)).toBe('45 min')
    expect(formatarDuracao(120)).toBe('2 h')
    expect(formatarDuracao(125)).toBe('2 h 05 min')
  })
  it('dados de fatura fechada', () => {
    const d = dadosRelatorioDeFatura({ periodo_inicio: '2026-09-15', periodo_fim: '2026-10-14', modelo: 'por_aula', ajuste: 0, ajuste_descricao: null, total: 100 }, dados.itens, 'X', 'Y')
    expect(d).toMatchObject({ alunoNome: 'X', personalNome: 'Y', periodoFim: '2026-10-14', total: 100 })
  })
  it('gera um PDF com logo, gráficos e muitas aulas (várias páginas)', async () => {
    const logo = 'data:image/png;base64,' + readFileSync('src/assets/brand/icon-mark.png').toString('base64')
    const muitas = Array.from({ length: 60 }, (_, i) => item({ id: `m${i}`, starts_at: `2026-09-${String((i % 28) + 1).padStart(2, '0')}T15:30:00Z`, nota: (i % 10) + 1, data_sessao: `2026-09-${String((i % 28) + 1).padStart(2, '0')}` }))
    const doc = await gerarRelatorioCompleto({ ...dados, itens: muitas }, logo)
    expect(doc.getNumberOfPages()).toBeGreaterThan(1)
  })
  it('gera um PDF de verdade, sem logo', async () => {
    const doc = await gerarRelatorioCompleto(dados)
    const bytes = new Uint8Array(doc.output('arraybuffer'))
    expect(String.fromCharCode(...bytes.slice(0, 5))).toBe('%PDF-')
  })
})
