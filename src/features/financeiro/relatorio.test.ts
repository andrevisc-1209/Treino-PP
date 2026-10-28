import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import {
  dadosRelatorioDeFatura,
  formatarDuracao,
  cabecalhoDaTabela,
  extrasDaFatura,
  fechamentoDaFatura,
  gerarRelatorioCompleto,
  localCurto,
  statusDoCiclo,
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
  it('tabela cronológica; com um só local a coluna Local some; falta aparece no lugar da modalidade', () => {
    expect(cabecalhoDaTabela(dados)).toEqual(['Data', 'Horário', 'Modalidade', 'Valor'])
    const t = linhasDaTabela(dados).map((l) => l.map(norm))
    expect(t[0]).toEqual(['Ter, 06/10', '12:30-13:30', '', 'R$ 100,00'])
    expect(t[1]).toEqual(['Qui, 08/10', '12:30-13:30', 'Falta', 'R$ 100,00'])
    expect(t[2]).toEqual(['Ter, 13/10', '12:30-13:30', 'Musculação', 'R$ 100,00'])
  })
  it('com mais de um local a coluna Local volta, com o nome curto (sem o endereço)', () => {
    const varios: DadosRelatorio = { ...dados, itens: [item({ id: 'p', starts_at: '2026-10-06T15:30:00Z', local: 'Smart Fit Laranjeiras, R. das Laranjeiras, 100 - Rio' }), item({ id: 'q', starts_at: '2026-10-07T15:30:00Z', local: 'Praia do Leme' })] }
    expect(cabecalhoDaTabela(varios)).toEqual(['Data', 'Horário', 'Modalidade', 'Local', 'Valor'])
    expect(linhasDaTabela(varios).map((l) => l[3])).toEqual(['Smart Fit Laranjeiras', 'Praia do Leme'])
  })
  it('nome do treino acompanha a modalidade', () => {
    const d: DadosRelatorio = { ...dados, itens: [item({ id: 'p', starts_at: '2026-10-06T15:30:00Z', modalidade: 'musculacao', plano_nome: 'Treino A' })] }
    expect(linhasDaTabela(d)[0][2]).toBe('Musculação · Treino A')
  })
  it('localCurto: nome do lugar; endereço puro mantém rua e número', () => {
    expect(localCurto('Smart Fit Laranjeiras, R. X, 100')).toBe('Smart Fit Laranjeiras')
    expect(localCurto('Rua das Flores, 120, Centro')).toBe('Rua das Flores, 120')
    expect(localCurto(null)).toBe('')
  })
  it('situação do ciclo: parcial até o último dia, encerrado depois', () => {
    expect(statusDoCiclo({ periodoFim: '2026-11-17', geradoEm: '2026-10-28' })).toBe('parcial')
    expect(statusDoCiclo({ periodoFim: '2026-11-17', geradoEm: '2026-11-17' })).toBe('encerrado')
    expect(statusDoCiclo({ periodoFim: '2026-11-17', geradoEm: '2026-11-20' })).toBe('encerrado')
  })
  it('mensal não mostra valor por aula; total e ajuste', () => {
    expect(cabecalhoDaTabela({ ...dados, modelo: 'mensal' })).not.toContain('Valor')
    expect(cabecalhoDaTabela({ ...dados, modelo: 'pacote' })).not.toContain('Valor')
    expect(norm(resumoTotalRelatorio(dados))).toBe('3 aulas · Total: R$ 280,00')
    expect(norm(textoAjuste({ ajuste: -20, ajusteDescricao: 'Desconto' }))).toBe('Ajuste: Desconto — -R$ 20,00')
    expect(norm(textoAjuste({ ajuste: 15, ajusteDescricao: null }))).toBe('Ajuste — +R$ 15,00')
  })
  it('tiles de resumo: realizadas (só presentes) e dias; locais só quando há mais de um', () => {
    expect(tilesResumo(dados).map((x) => [norm(x.valor), x.rotulo])).toEqual([['2', 'Aulas realizadas'], ['2', 'Dias treinados']])
    const varios = tilesResumo({ ...dados, itens: [...dados.itens, item({ id: 'd', starts_at: '2026-10-09T15:30:00Z', local: 'Praça' })] })
    expect(varios.at(-1)).toEqual({ valor: '2', rotulo: 'Locais diferentes' })
  })
  it('pacote: "4 de 10 aulas do pacote"', () => {
    expect(tilesResumo({ ...dados, modelo: 'pacote', aulasContratadas: 10 })[0]).toEqual({ valor: '2 de 10', rotulo: 'Aulas do pacote' })
  })
  it('frequência média só aparece com 3 semanas ou mais de dados', () => {
    expect(tilesResumo(dados).some((t) => t.rotulo === 'Frequência média')).toBe(false)
    const tres = [item({ id: 'a', starts_at: '2026-10-05T15:30:00Z' }), item({ id: 'b', starts_at: '2026-10-12T15:30:00Z' }), item({ id: 'c', starts_at: '2026-10-19T15:30:00Z' }), item({ id: 'd', starts_at: '2026-10-20T15:30:00Z' })]
    expect(tilesResumo({ ...dados, itens: tres }).find((t) => t.rotulo === 'Frequência média')?.valor).toBe('1,3/semana')
  })
  it('fechamento: pago mostra a data; em aberto leva o Pix só quando enviado; cancelada não tem', () => {
    expect(fechamentoDaFatura({ status: 'paga', paga_em: '2026-10-28', vencimento: null })).toEqual({ tipo: 'pago', pagaEm: '2026-10-28' })
    expect(fechamentoDaFatura({ status: 'aberta', paga_em: null, vencimento: '2026-11-05' })).toEqual({ tipo: 'aberto', vencimento: '2026-11-05', pixQrDataUrl: null })
    expect(fechamentoDaFatura({ status: 'enviada', paga_em: null, vencimento: null }, 'data:x')).toMatchObject({ pixQrDataUrl: 'data:x' })
    expect(fechamentoDaFatura({ status: 'cancelada', paga_em: null, vencimento: null })).toBeUndefined()
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
  it('gera um PDF de pacote em andamento, parcial e com fechamento pago', async () => {
    const d: DadosRelatorio = { ...dados, modelo: 'pacote', aulasContratadas: 10, periodoFim: '2026-12-26', geradoEm: '2026-10-28', fechamento: { tipo: 'pago', pagaEm: '2026-10-28' } }
    const doc = await gerarRelatorioCompleto(d)
    expect(String.fromCharCode(...new Uint8Array(doc.output('arraybuffer')).slice(0, 5))).toBe('%PDF-')
  })
  it('tile de treinos à distância não cobrados e total só com as aulas cobradas', () => {
    const d: DadosRelatorio = { ...dados, itens: [...dados.itens, item({ id: 'x', starts_at: '2026-10-09T15:30:00Z', a_distancia: true, fora_da_cobranca: true, modalidade: 'corrida' })] }
    expect(tilesResumo(d).find((t) => t.rotulo === 'Treino à distância')?.valor).toBe('1')
    expect(norm(resumoTotalRelatorio(d))).toBe('3 aulas · Total: R$ 280,00')
  })
  it('avaliação do personal: vem da fatura e o PDF sai com ela (inclusive texto longo)', async () => {
    const extras = extrasDaFatura({ modelo: 'por_aula', qtd_aulas: 3, status: 'aberta', paga_em: null, vencimento: null, avaliacao_conquistas: 'Ótima constância', avaliacao_atencao: null, avaliacao_proximos: '  ' })
    expect(extras.avaliacao).toEqual({ conquistas: 'Ótima constância', atencao: null, proximos: null })
    expect(extrasDaFatura({ modelo: 'por_aula', qtd_aulas: 3, status: 'aberta', paga_em: null, vencimento: null }).avaliacao).toBeNull()
    const longa = 'Evolução constante em todas as modalidades. '.repeat(11)
    const doc = await gerarRelatorioCompleto({ ...dados, avaliacao: { conquistas: longa, atencao: longa, proximos: 'Correr 10 km' } })
    expect(String.fromCharCode(...new Uint8Array(doc.output('arraybuffer')).slice(0, 5))).toBe('%PDF-')
  })
})

