import { describe, expect, it } from 'vitest'
import { lerPlanilha } from './importarAlunos'
import { limparTextoColado, montarPromptIA } from './promptIA'

// Resposta REAL de uma IA ao prompt, com a lista bagunçada de teste (28/10/2026). Ela não inventou nada, não levou saúde, CPF nem mensalidade e
// descartou a repetida; ficou com apelido no nome e deixou o sexo vazio onde a lista dizia "mulher". O prompt foi apertado nesses dois pontos.
const RESPOSTA = [
  'nome;telefone;email;nascimento;sexo;objetivos',
  'Carla Menezes;(11) 99999-0001;carlinha.menezes@exemplo.com;;;Perder peso|Hipertrofia',
  'joão pedro (JP);(21) 98888-0002;;03/07/1995;;Hipertrofia',
  'Ana Beatriz Lima;; ;15/11/1989;F;Corrida/maratona',
  'Sr. Paulo;;;;;Saúde e qualidade de vida',
  'Marcos Vinícius;(31) 97777-0005;marcos@exemplo.com;;;Condicionamento físico',
  'Fernanda (a loira da academia);(11) 96666-0006;;;;Mobilidade/flexibilidade',
  'Lucas Teixeira;;lucas.teixeira@exemplo.com;25/12/2001;;Hipertrofia',
  'Beatriz Souza;;;;;',
].join('\n')

describe('resposta real de uma IA à lista bagunçada', () => {
  const r = lerPlanilha(limparTextoColado('```csv\n' + RESPOSTA + '\n```'), [], '2026-10-28')
  it('a importação lê tudo: 8 alunos, nenhum erro, nenhum aviso', () => {
    if (!r.ok) throw new Error(r.erro)
    expect(r.linhas).toHaveLength(8)
    expect(r.linhas.map((l) => l.status)).toEqual(Array(8).fill('ok'))
  })
  it('os campos saem como esperado (e-mail só com espaço vira vazio; objetivos vêm da lista do app)', () => {
    if (!r.ok) throw new Error(r.erro)
    const ana = r.linhas[2].aluno!
    expect(ana).toMatchObject({ name: 'Ana Beatriz Lima', email: null, birth_date: '1989-11-15', sex: 'F', objetivos: ['Corrida/maratona'] })
    expect(r.linhas[0].aluno).toMatchObject({ phone: '(11) 99999-0001', objetivos: ['Perder peso', 'Hipertrofia'] })
    expect(r.linhas[7].aluno).toMatchObject({ name: 'Beatriz Souza', phone: null, objetivos: [] })
  })
})

describe('prompt apertado depois da resposta real', () => {
  const prompt = montarPromptIA()
  it('pede só o nome da pessoa, com maiúsculas normais, sem apelido nem descrição entre parênteses', () => {
    expect(prompt).toMatch(/só o nome da pessoa/i)
    expect(prompt).toContain('maiúscula')
    expect(prompt).toMatch(/apelidos, observações e descrições/)
  })
  it('manda preencher o sexo quando a lista diz explicitamente (feminino, mulher, masculino, homem)', () => {
    expect(prompt).toMatch(/feminino.*mulher.*masculino.*homem/)
    expect(prompt).toContain('NÃO deduza pelo nome')
  })
})
