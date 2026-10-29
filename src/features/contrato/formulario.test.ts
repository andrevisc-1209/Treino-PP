import { describe, expect, it } from 'vitest'
import { REGRAS_PADRAO } from './contrato'
import { dadosDoFormulario, formularioInicial, lerNumero, lerRegrasSalvas, mudouNoCadastro, type OrigemContrato } from './formulario'

const origem: OrigemContrato = {
  aluno: { cpf: null, endereco: null, birth_date: '1990-01-01' },
  cobranca: { modelo: 'por_aula', valor_aula: 80, valor_mensal: null },
  pacote: null,
  hoje: '2026-10-29',
  menor: false,
  regrasSalvas: null,
  horariosTexto: '',
  localSugerido: '',
}
const contexto = { personal: { nome: 'André', cpf: '52998224725', cidade: 'Rio', uf: 'RJ' }, aluno: { nome: 'Maria', telefone: '(21) 9', email: null }, hoje: '2026-10-29' }

describe('formulário inicial', () => {
  it('usa a cobrança do aluno e a data de hoje', () => {
    const f = formularioInicial(origem)
    expect(f).toMatchObject({ forma: 'por_aula', valorAula: '80', inicio: '2026-10-29', menor: false, cpf: '', regras: REGRAS_PADRAO })
  })
  it('pacote ativo vale mais que a cobrança e traz quantidade, valor, validade e início', () => {
    const f = formularioInicial({ ...origem, pacote: { qtd_aulas: 10, valor: 800.5, validade_dias: 60, inicio: '2026-10-20' } })
    expect(f).toMatchObject({ forma: 'pacote', qtdAulas: '10', valorPacote: '800,5', validadeDias: '60', inicio: '2026-10-20' })
  })
  it('traz os horários fixos e o local do aluno, que continuam editáveis', () => {
    const f = formularioInicial({ ...origem, horariosTexto: 'segundas e quartas, às 07:00', localSugerido: 'Academia X — Rua Y, 10' })
    expect(f).toMatchObject({ diasHorarios: 'segundas e quartas, às 07:00', local: 'Academia X — Rua Y, 10' })
    expect(dadosDoFormulario({ ...f, diasHorarios: 'terças, às 8h' }, contexto).diasHorarios).toBe('terças, às 8h')
  })
  it('sem cobrança nem pacote começa em mensal; aluno menor liga o responsável; regras salvas sobrepõem o padrão', () => {
    const f = formularioInicial({ ...origem, cobranca: null, menor: true, regrasSalvas: { antecedenciaHoras: 24 } })
    expect(f.forma).toBe('mensal')
    expect(f.menor).toBe(true)
    expect(f.regras.antecedenciaHoras).toBe(24)
    expect(f.regras.multaPct).toBe(2)
  })
})

describe('do formulário para os dados', () => {
  it('lê números com vírgula e ponto de milhar; só dígitos no CPF', () => {
    expect(lerNumero('1.250,50')).toBe(1250.5)
    expect(lerNumero('')).toBeNull()
    expect(lerNumero('abc')).toBeNull()
    const d = dadosDoFormulario({ ...formularioInicial(origem), cpf: '390.533.447-05', endereco: '  Rua A  ', vencimentoDia: '10', modalidades: ['Corrida'] }, contexto)
    expect(d.aluno).toMatchObject({ cpf: '39053344705', endereco: 'Rua A', nome: 'Maria' })
    expect(d.vencimentoDia).toBe(10)
    expect(d.responsavel).toBeNull()
    expect(d.geradoEm).toBe('2026-10-29')
  })
  it('responsável legal só entra quando o aluno é menor', () => {
    const f = { ...formularioInicial(origem), menor: true, respNome: ' Joana ', respCpf: '111.444.777-35' }
    expect(dadosDoFormulario(f, contexto).responsavel).toEqual({ nome: 'Joana', cpf: '11144477735' })
  })
  it('só oferece guardar no cadastro o que é novo ou mudou', () => {
    const f = formularioInicial(origem)
    expect(mudouNoCadastro(f, { cpf: null, endereco: null })).toBe(false)
    expect(mudouNoCadastro({ ...f, cpf: '390.533.447-05' }, { cpf: null, endereco: null })).toBe(true)
    expect(mudouNoCadastro({ ...f, cpf: '390.533.447-05' }, { cpf: '39053344705', endereco: null })).toBe(false)
    expect(mudouNoCadastro({ ...f, endereco: 'Rua B' }, { cpf: null, endereco: 'Rua A' })).toBe(true)
  })
})

describe('regras lembradas no aparelho', () => {
  const guardar = (v: string | null) => ({ getItem: () => v })
  it('lê só chaves conhecidas e do tipo certo', () => {
    expect(lerRegrasSalvas(guardar(JSON.stringify({ antecedenciaHoras: 24, faltaCobrada: 'sim', intruso: 1 })), 'u')).toEqual({ antecedenciaHoras: 24 })
  })
  it('sem armazenamento, vazio ou JSON ruim: nenhuma regra salva', () => {
    expect(lerRegrasSalvas(null, 'u')).toBeNull()
    expect(lerRegrasSalvas(guardar(null), 'u')).toBeNull()
    expect(lerRegrasSalvas(guardar('{ruim'), 'u')).toBeNull()
    expect(lerRegrasSalvas(guardar('[1]'), 'u')).toBeNull()
    expect(lerRegrasSalvas({ getItem: () => { throw new Error('bloqueado') } }, 'u')).toBeNull()
  })
})
