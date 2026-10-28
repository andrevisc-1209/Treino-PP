import { describe, expect, it } from 'vitest'
import { lerPlanilha } from '../importar/importarAlunos'
import { celulaCsv, montarCsvAlunos, neutralizarFormula, nomeDoArquivoExportacao, type AlunoParaExportar } from './exportarAlunos'

const maria: AlunoParaExportar = { name: 'Maria Souza', phone: '(11) 91234-5678', email: 'maria@exemplo.com', birth_date: '1990-03-15', sex: 'F', objetivos: ['Hipertrofia', 'Saúde e qualidade de vida'], active: true }
const paulo: AlunoParaExportar = { name: 'Paulo', phone: null, email: null, birth_date: null, sex: null, objetivos: [], active: false }

describe('montarCsvAlunos', () => {
  it('cabeçalho, ponto e vírgula, CRLF, datas dd/mm/aaaa e situação', () => {
    const csv = montarCsvAlunos([maria, paulo])
    expect(csv).toBe(
      'nome;telefone;email;nascimento;sexo;objetivos;situacao\r\n' +
        'Maria Souza;(11) 91234-5678;maria@exemplo.com;15/03/1990;F;Hipertrofia|Saúde e qualidade de vida;ativo\r\n' +
        'Paulo;;;;;;arquivado\r\n',
    )
  })
  it('sem alunos, só o cabeçalho', () => expect(montarCsvAlunos([])).toBe('nome;telefone;email;nascimento;sexo;objetivos;situacao\r\n'))
  it('nunca leva dado de saúde: só as colunas básicas', () => {
    expect(montarCsvAlunos([maria])).not.toMatch(/lesao|lesão|cirurgia|medicamento|altura/i)
  })
})

describe('segurança do CSV', () => {
  it('neutraliza fórmulas de planilha (= + - @)', () => {
    expect(neutralizarFormula('=1+1')).toBe("'=1+1")
    expect(neutralizarFormula('@cmd')).toBe("'@cmd")
    expect(neutralizarFormula('-5')).toBe("'-5")
    expect(neutralizarFormula('+55 11')).toBe("'+55 11")
    expect(neutralizarFormula('Maria')).toBe('Maria')
  })
  it('aspas quando tem ; " ou quebra de linha, com aspas dobradas', () => {
    expect(celulaCsv('Silva; Ana')).toBe('"Silva; Ana"')
    expect(celulaCsv('disse "oi"')).toBe('"disse ""oi"""')
    expect(celulaCsv('a\nb')).toBe('"a\nb"')
  })
})

describe('ida e volta com a importação', () => {
  it('o arquivo exportado é lido de volta pela importação, sem erro nem aviso', () => {
    const r = lerPlanilha(montarCsvAlunos([maria, paulo]), [], '2026-10-28')
    if (!r.ok) throw new Error(r.erro)
    expect(r.linhas.map((l) => l.status)).toEqual(['ok', 'ok'])
    expect(r.linhas[0].aluno).toEqual({ name: 'Maria Souza', phone: '(11) 91234-5678', email: 'maria@exemplo.com', birth_date: '1990-03-15', sex: 'F', objetivos: ['Hipertrofia', 'Saúde e qualidade de vida'] })
    expect(r.colunasIgnoradas).toEqual(['situacao'])
  })
})

describe('nome do arquivo', () => it('inclui a data', () => expect(nomeDoArquivoExportacao('2026-10-28')).toBe('alunos-2026-10-28.csv')))
