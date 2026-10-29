import { describe, expect, it } from 'vitest'
import { REGRAS_PADRAO, type DadosContrato } from './contrato'
import { gerarContratoPdf, nomeArquivoContrato } from './pdf'

const d: DadosContrato = {
  personal: { nome: 'Andre Scherer', cpf: '52998224725', cidade: 'Rio de Janeiro', uf: 'RJ' },
  aluno: { nome: 'Maria Souza', cpf: '39053344705', endereco: 'Rua A, 10', telefone: null, email: null },
  responsavel: null,
  modalidades: ['Corrida'],
  local: 'Parque',
  diasHorarios: '',
  inicio: '2026-11-02',
  forma: 'mensal',
  valorAula: null,
  valorMensal: 400,
  qtdAulas: null,
  valorPacote: null,
  validadeDias: null,
  vencimentoDia: 10,
  regras: { ...REGRAS_PADRAO, reajuste: true, perdaDoHorario: true, trancamento: true, trancamentoTaxaPct: 30 },
  foro: 'Rio de Janeiro/RJ',
  geradoEm: '2026-10-29',
}

describe('PDF do contrato', () => {
  it('nome do arquivo sem acento e com o ano', () => {
    expect(nomeArquivoContrato('José da Conceição', '2026-10-29')).toBe('contrato-jose-da-conceicao-2026.pdf')
    expect(nomeArquivoContrato('', '2026-10-29')).toBe('contrato-aluno-2026.pdf')
  })
  it('gera um PDF com o texto, as assinaturas e o aviso do modelo no rodapé', async () => {
    const doc = await gerarContratoPdf(d, { comprimir: false })
    expect(String.fromCharCode(...new Uint8Array(doc.output('arraybuffer')).slice(0, 5))).toBe('%PDF-')
    const c = doc.output()
    expect(c).toContain('CONTRATO DE PRESTA')
    expect(c).toContain('Maria Souza')
    expect(c).toContain('390.533.447-05')
    expect(c).toContain('CONTRATADO')
    expect(c).toContain('TESTEMUNHA 1')
    expect(c).toContain('Modelo-padr')
    expect(doc.getNumberOfPages()).toBeGreaterThanOrEqual(2)
  })
  it('rodapé numera as páginas', async () => {
    const doc = await gerarContratoPdf(d, { comprimir: false })
    expect(doc.output()).toContain(`${doc.getNumberOfPages()}/${doc.getNumberOfPages()}`)
  })
})
