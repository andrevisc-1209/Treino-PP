import { describe, expect, it } from 'vitest'
import { avisosDoContrato, dataPorExtenso, ehMenorDeIdade, moeda, montarContrato, problemasDoContrato, REGRAS_PADRAO, type DadosContrato } from './contrato'

const base: DadosContrato = {
  personal: { nome: 'André Scherer', cpf: '52998224725', cidade: 'Rio de Janeiro', uf: 'RJ' },
  aluno: { nome: 'Maria Souza', cpf: '39053344705', endereco: 'Rua A, 10, Centro', telefone: '(21) 99999-0000', email: 'maria@exemplo.com' },
  responsavel: null,
  modalidades: ['Musculação', 'Corrida'],
  local: 'Academia Central',
  diasHorarios: '',
  inicio: '2026-11-02',
  forma: 'mensal',
  valorAula: null,
  valorMensal: 400,
  qtdAulas: null,
  valorPacote: null,
  validadeDias: null,
  vencimentoDia: 10,
  regras: REGRAS_PADRAO,
  foro: 'Rio de Janeiro/RJ',
  geradoEm: '2026-10-29',
}
const texto = (d: DadosContrato): string => {
  const t = montarContrato(d)
  return [t.titulo, t.abertura, ...t.partes, ...t.clausulas.flatMap((c) => [c.titulo, ...c.paragrafos]), t.fecho, t.localData].join('\n')
}

describe('formatação', () => {
  it('moeda em reais, data por extenso e menor de idade', () => {
    expect(moeda(1250.5)).toBe('R$ 1.250,50')
    expect(moeda(null)).toBe('R$ ____,__')
    expect(dataPorExtenso('2026-10-29')).toBe('29 de outubro de 2026')
    expect(ehMenorDeIdade('2010-11-01', '2026-10-29')).toBe(true)
    expect(ehMenorDeIdade('2008-10-29', '2026-10-29')).toBe(false)
    expect(ehMenorDeIdade('2008-10-30', '2026-10-29')).toBe(true)
    expect(ehMenorDeIdade(null, '2026-10-29')).toBe(false)
  })
})

describe('contrato mensal', () => {
  const t = montarContrato(base)
  it('partes com CPF mascarado, endereço e cidade', () => {
    expect(t.partes[0]).toContain('André Scherer, CPF 529.982.247-25, de Rio de Janeiro/RJ')
    expect(t.partes[1]).toContain('Maria Souza, CPF 390.533.447-05, residente em Rua A, 10, Centro')
  })
  it('cláusulas numeradas em sequência e parágrafos 1.1, 1.2…', () => {
    expect(t.clausulas[0].titulo).toBe('CLÁUSULA 1ª – DO OBJETO')
    expect(t.clausulas[0].paragrafos[0]).toMatch(/^1\.1 /)
    expect(t.clausulas.map((c) => c.titulo.split(' – ')[0])).toEqual(t.clausulas.map((_, i) => `CLÁUSULA ${i + 1}ª`))
  })
  it('valor, vencimento, multa, cancelamento e reposição do padrão', () => {
    const x = texto(base)
    expect(x).toContain('A mensalidade é de R$ 400,00, com vencimento todo dia 10.')
    expect(x).toContain('multa de 2% sobre o valor em atraso e juros de 1% ao mês')
    expect(x).toContain('antecedência mínima de 12 horas')
    expect(x).toContain('contabilizada como realizada, cobrada normalmente e não poderá ser reposta')
    expect(x).toContain('repostas no mesmo mês')
    expect(x).toContain('Todos os treinos devem ser previamente agendados.')
    expect(x).toContain('comarca de Rio de Janeiro/RJ')
    expect(t.localData).toBe('Rio de Janeiro, 29 de outubro de 2026.')
  })
  it('cláusulas desligadas não aparecem (reajuste e perda do horário)', () => {
    expect(texto(base)).not.toContain('reajustado')
    expect(texto(base)).not.toContain('perda do horário')
  })
  it('não leva dado de saúde: só remete ao termo de consentimento', () => {
    const x = texto(base)
    expect(x).toContain('termo de consentimento específico')
    expect(x).not.toMatch(/lesão|cirurgia|medicamento/i)
  })
})

describe('regras do personal (inspiradas no contrato de um professor)', () => {
  const regras = { ...REGRAS_PADRAO, antecedenciaHoras: 24, multaPct: 5, reajuste: true, perdaDoHorario: true, trancamento: true, trancamentoAvisoDias: 30, trancamentoTaxaPct: 50, horariosConformeAgenda: true }
  const x = texto({ ...base, regras })
  it('24 horas, reajuste, perda do horário e trancamento com taxa', () => {
    expect(x).toContain('antecedência mínima de 24 horas')
    expect(x).toContain('mediante aviso prévio de 30 dias, em razão de mudanças na frequência semanal, no deslocamento')
    expect(x).toContain('perda do horário')
    expect(x).toContain('aviso prévio de 30 dias.')
    expect(x).toContain('taxa de 50% do valor da mensalidade')
    expect(x).toContain('conforme a disponibilidade da agenda')
  })
  it('multa acima de 2% gera aviso (e continua no texto, a escolha é do personal)', () => {
    expect(x).toContain('multa de 5%')
    expect(avisosDoContrato({ ...base, regras }).some((a) => a.includes('acima de 2%'))).toBe(true)
    expect(avisosDoContrato(base).some((a) => a.includes('acima de 2%'))).toBe(false)
  })
  it('trancamento só vale na forma mensal; sem ele a rescisão é simples', () => {
    const y = texto({ ...base, forma: 'por_aula', valorAula: 80, regras })
    expect(y).not.toContain('taxa de 50%')
    expect(texto(base)).toContain('mediante comunicação prévia, quitando-se os valores devidos')
  })
  it('reposição por prazo e sem reposição; falta não cobrada', () => {
    expect(texto({ ...base, regras: { ...REGRAS_PADRAO, reposicao: 'prazo', reposicaoDias: 15 } })).toContain('repostas em até 15 dias')
    expect(texto({ ...base, regras: { ...REGRAS_PADRAO, reposicao: 'nenhuma' } })).toContain('não serão repostas')
    expect(texto({ ...base, regras: { ...REGRAS_PADRAO, faltaCobrada: false } })).toContain('não será cobrada')
  })
  it('sem multa: nenhuma cláusula de atraso', () => {
    expect(texto({ ...base, regras: { ...REGRAS_PADRAO, multaAtiva: false } })).not.toContain('Em caso de atraso')
  })
})

describe('foro e cidade da assinatura', () => {
  it('usa a cidade informada no foro, que pode ser outra que a do personal', () => {
    const t = montarContrato({ ...base, foro: 'Niterói/RJ' })
    expect(t.clausulas[t.clausulas.length - 1].paragrafos[0]).toBe('9.1 Fica eleito o foro da comarca de Niterói/RJ para dirimir quaisquer dúvidas deste contrato.')
    expect(t.localData).toBe('Niterói, 29 de outubro de 2026.')
    expect(t.partes[0]).toContain('de Rio de Janeiro/RJ')
  })
})

describe('por aula, pacote e menor de idade', () => {
  it('por aula: valor da aula e cobrança do mês', () => {
    const x = texto({ ...base, forma: 'por_aula', valorAula: 80, valorMensal: null, vencimentoDia: null })
    expect(x).toContain('Cada aula realizada custa R$ 80,00')
    expect(x).toContain('em data a combinar entre as partes')
    expect(x).toContain('por prazo indeterminado')
  })
  it('pacote: quantidade, valor, validade e vigência até o fim do pacote', () => {
    const x = texto({ ...base, forma: 'pacote', qtdAulas: 10, valorPacote: 800, validadeDias: 60, valorMensal: null })
    expect(x).toContain('pacote de 10 aulas pelo valor de R$ 800,00')
    expect(x).toContain('em até 60 dias, contados de 02/11/2026')
    expect(x).toContain('até o término do pacote ou de sua validade')
  })
  it('menor: responsável legal nas partes, na saúde e na assinatura', () => {
    const t = montarContrato({ ...base, responsavel: { nome: 'Joana Souza', cpf: '11144477735' } })
    expect(t.partes[2]).toBe('RESPONSÁVEL LEGAL do(a) CONTRATANTE: Joana Souza, CPF 111.444.777-35.')
    expect(t.clausulas.some((c) => c.paragrafos.some((p) => p.includes('menor de idade')))).toBe(true)
    expect(t.assinaturas[1]).toEqual({ rotulo: 'RESPONSÁVEL LEGAL', nome: 'Joana Souza' })
  })
  it('o que falta vira linha em branco (CPF, endereço, cidade)', () => {
    const x = texto({ ...base, aluno: { ...base.aluno, cpf: null, endereco: null }, personal: { ...base.personal, cpf: null, cidade: null, uf: null }, foro: '' })
    expect(x).toContain('CPF ___.___.___-__')
    expect(x).toContain('residente em ________________')
    expect(x).toContain('comarca de ________________')
    expect(montarContrato({ ...base, foro: '' }).localData).toBe('________________, 29 de outubro de 2026.')
  })
})

describe('o que impede de gerar', () => {
  it('modalidade e valor da forma escolhida', () => {
    expect(problemasDoContrato(base)).toEqual([])
    expect(problemasDoContrato({ ...base, modalidades: [] })).toContain('Escolha ao menos uma modalidade.')
    expect(problemasDoContrato({ ...base, valorMensal: null })).toContain('Informe o valor da mensalidade.')
    expect(problemasDoContrato({ ...base, forma: 'por_aula' })).toContain('Informe o valor da aula.')
    expect(problemasDoContrato({ ...base, forma: 'pacote' })).toHaveLength(3)
    expect(problemasDoContrato({ ...base, vencimentoDia: 40 })).toContain('O dia de vencimento vai de 1 a 31.')
  })
  it('sem CPF do aluno só avisa', () => {
    expect(avisosDoContrato({ ...base, aluno: { ...base.aluno, cpf: null } }).some((a) => a.includes('Sem o CPF'))).toBe(true)
  })
})
