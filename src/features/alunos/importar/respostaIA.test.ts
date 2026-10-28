import { describe, expect, it } from 'vitest'
import { lerPlanilha } from './importarAlunos'
import { OBJETIVOS } from '../opcoes'
import { EQUIVALENCIAS, EXEMPLO_ENTRADA_SAIDA, CABECALHO_CSV, limparTextoColado, montarPromptIA } from './promptIA'

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

// 2ª resposta real (com o prompt já apertado em nome e sexo): nomes limpos, mas a data "15/11/89" e os objetivos "emagrecer e ganhar massa" ficaram vazios.
const RESPOSTA_2 = [
  'nome;telefone;email;nascimento;sexo;objetivos',
  'Carla Menezes;(11) 99999-0001;carlinha.menezes@exemplo.com;;;',
  'João Pedro;(21) 98888-0002;;03/07/1995;;Hipertrofia',
  'Ana Beatriz Lima;;; ;F;Corrida/maratona',
  'Paulo;;;;;Saúde e qualidade de vida',
  'Marcos Vinícius;(31) 97777-0005;marcos@exemplo.com;;;Condicionamento físico',
  'Fernanda;(11) 96666-0006;;;;Mobilidade/flexibilidade',
  'Lucas Teixeira;;lucas.teixeira@exemplo.com;25/12/2001;;Hipertrofia',
  'Beatriz Souza;;;;;',
].join('\n')

describe('2ª resposta real: nomes limpos', () => {
  it('a importação lê os 8 sem erro nem aviso, com os nomes limpos', () => {
    const r = lerPlanilha(RESPOSTA_2, [], '2026-10-28')
    if (!r.ok) throw new Error(r.erro)
    expect(r.linhas.map((l) => l.status)).toEqual(Array(8).fill('ok'))
    expect(r.linhas.map((l) => l.aluno!.name)).toEqual(['Carla Menezes', 'João Pedro', 'Ana Beatriz Lima', 'Paulo', 'Marcos Vinícius', 'Fernanda', 'Lucas Teixeira', 'Beatriz Souza'])
  })
  it('se a IA mandar o ano com 2 dígitos, o app completa (é o que o prompt agora autoriza)', () => {
    const r = lerPlanilha('nome;nascimento\nAna;15/11/89\nBia;03/07/05', [], '2026-10-28')
    if (!r.ok) throw new Error(r.erro)
    expect(r.linhas.map((l) => l.aluno!.birth_date)).toEqual(['1989-11-15', '2005-07-03'])
    expect(r.linhas.every((l) => l.status === 'ok')).toBe(true)
  })
})

describe('prompt: datas de 2 dígitos e equivalências de objetivo', () => {
  const prompt = montarPromptIA()
  it('autoriza o ano com 2 dígitos e só manda deixar vazio quando falta dia, mês ou há só a idade', () => {
    expect(prompt).toContain('15/11/89')
    expect(prompt).toContain('o app completa o ano')
    expect(prompt).toContain('faltar dia ou mês')
  })
  it('traz as equivalências (emagrecer = Perder peso, ganhar massa = Hipertrofia) e só elas', () => {
    expect(prompt).toContain('emagrecer, perder peso, secar, queimar gordura = Perder peso')
    expect(prompt).toContain('ganhar massa')
    expect(prompt).toContain('Aceite estas equivalências (e só elas)')
  })
  it('toda equivalência aponta para um objetivo que existe no app (não deriva)', () => {
    for (const objetivo of Object.keys(EQUIVALENCIAS)) expect(OBJETIVOS).toContain(objetivo)
    for (const o of OBJETIVOS.filter((x) => x !== 'Outros')) expect(Object.keys(EQUIVALENCIAS)).toContain(o)
  })
})

// 3ª resposta real (prompt com datas de 2 dígitos e equivalências): Carla e Ana voltaram inteiras. Sobras: uma célula a mais no fim da última linha
// (";;;;;;") e o sexo da Fernanda vazio ("mulher" na lista). A importação tolera a célula a mais.
const RESPOSTA_3 = [
  'nome;telefone;email;nascimento;sexo;objetivos',
  'Carla Menezes;(11) 99999-0001;carlinha.menezes@exemplo.com;; ;Perder peso|Hipertrofia',
  'João Pedro;(21) 98888-0002;;03/07/1995;;Hipertrofia',
  'Ana Beatriz Lima;; ;15/11/89;F;Corrida/maratona',
  'Paulo;;;;;Saúde e qualidade de vida',
  'Marcos Vinícius;(31) 97777-0005;marcos@exemplo.com;;;Condicionamento físico',
  'Fernanda;(11) 96666-0006;;;;Mobilidade/flexibilidade',
  'Lucas Teixeira;;lucas.teixeira@exemplo.com;25/12/2001;;Hipertrofia',
  'Beatriz Souza;;;;;;',
].join('\n')

describe('3ª resposta real: Carla e Ana inteiras', () => {
  const r = lerPlanilha(RESPOSTA_3, [], '2026-10-28')
  it('lê os 8 sem erro nem aviso, mesmo com a célula a mais no fim', () => {
    if (!r.ok) throw new Error(r.erro)
    expect(r.linhas.map((l) => l.status)).toEqual(Array(8).fill('ok'))
    expect(r.linhas[7].aluno).toMatchObject({ name: 'Beatriz Souza', phone: null, objetivos: [] })
  })
  it('a Carla volta com os objetivos e a Ana com o nascimento (ano de 2 dígitos completado)', () => {
    if (!r.ok) throw new Error(r.erro)
    expect(r.linhas[0].aluno).toMatchObject({ name: 'Carla Menezes', sex: null, objetivos: ['Perder peso', 'Hipertrofia'] })
    expect(r.linhas[2].aluno).toMatchObject({ name: 'Ana Beatriz Lima', birth_date: '1989-11-15', sex: 'F' })
  })
})

describe('prompt: exemplo de entrada e saída com o sexo explícito', () => {
  it('mostra "mulher" virando F e a saída do exemplo é lida pela importação sem erro nem aviso', () => {
    const prompt = montarPromptIA()
    expect(prompt).toContain('Entrada: Fernanda, mulher')
    expect(prompt).toContain(EXEMPLO_ENTRADA_SAIDA)
    const r = lerPlanilha(`${CABECALHO_CSV}\n${EXEMPLO_ENTRADA_SAIDA}`, [], '2026-10-28')
    if (!r.ok) throw new Error(r.erro)
    expect(r.linhas[0].status).toBe('ok')
    expect(r.linhas[0].aluno).toMatchObject({ name: 'Fernanda', sex: 'F', objetivos: ['Mobilidade/flexibilidade'] })
  })
})
