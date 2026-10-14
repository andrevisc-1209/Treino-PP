import { describe, expect, it } from 'vitest'
import { construirRelatorioPdf, linhasDaTabela, nomeArquivoRelatorio, resumoTotalRelatorio, rotuloAulaCiclo, rotuloModalidade, type DadosRelatorio } from './relatorio'

const norm = (s: string) => s.replace(/\s/g, ' ')

const dados: DadosRelatorio = {
  alunoNome: 'André Scherer',
  personalNome: 'Carla Souza',
  periodoInicio: '2026-09-15',
  periodoFim: '2026-10-14',
  modelo: 'por_aula',
  linhas: [
    { startsAt: '2026-10-13T15:30:00Z', durationMin: 60, modalidade: 'musculacao', local: 'Academia X', valor: 100 },
    { startsAt: '2026-10-06T15:30:00Z', durationMin: 60, modalidade: null, local: null, valor: 100 },
  ],
  ajuste: -20,
  ajusteDescricao: 'Desconto',
  total: 180,
}

describe('relatório do ciclo', () => {
  it('nome do arquivo: slug do aluno + mês/ano em que o ciclo termina', () => {
    expect(nomeArquivoRelatorio('André Scherer', '2026-10-14')).toBe('relatorio-andre-scherer-out-2026.pdf')
    expect(nomeArquivoRelatorio('  José  da Silva-Júnior ', '2027-01-09')).toBe('relatorio-jose-da-silva-junior-jan-2027.pdf')
    expect(nomeArquivoRelatorio('', '2026-12-01')).toBe('relatorio-aluno-dez-2026.pdf')
  })
  it('rótulo da aula: dia da semana, data e horário (fuso de São Paulo)', () => {
    expect(rotuloAulaCiclo('2026-10-13T15:30:00Z', 60)).toBe('Ter, 13/10 · 12:30–13:30')
  })
  it('modalidade só quando conhecida', () => {
    expect(rotuloModalidade('natacao')).toBe('Natação')
    expect(rotuloModalidade(null)).toBeNull()
    expect(rotuloModalidade('xyz')).toBeNull()
  })
  it('tabela em ordem cronológica, "-" para o que falta, valor em R$', () => {
    const t = linhasDaTabela(dados).map((l) => l.map(norm))
    expect(t[0]).toEqual(['Ter, 06/10', '12:30-13:30', '-', '-', 'R$ 100,00'])
    expect(t[1]).toEqual(['Ter, 13/10', '12:30-13:30', 'Musculação', 'Academia X', 'R$ 100,00'])
  })
  it('mensal não mostra valor por aula; resumo com quantidade e total', () => {
    expect(linhasDaTabela({ ...dados, modelo: 'mensal' }).every((l) => l[4] === '-')).toBe(true)
    expect(norm(resumoTotalRelatorio(dados))).toBe('2 aulas - Total: R$ 180,00')
    expect(resumoTotalRelatorio({ ...dados, linhas: dados.linhas.slice(0, 1) })).toContain('1 aula -')
  })
  it('gera um PDF de verdade', async () => {
    const doc = await construirRelatorioPdf(dados)
    const bytes = new Uint8Array(doc.output('arraybuffer'))
    expect(String.fromCharCode(...bytes.slice(0, 5))).toBe('%PDF-')
    expect(doc.getNumberOfPages()).toBeGreaterThanOrEqual(1)
  })
})
