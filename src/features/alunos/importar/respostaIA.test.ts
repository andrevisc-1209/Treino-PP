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
  it('a importação lê os 8, sem erro; só os dois nomes com apelido entre parênteses ("(JP)", "(a loira da academia)") ganham aviso', () => {
    if (!r.ok) throw new Error(r.erro)
    expect(r.linhas).toHaveLength(8)
    expect(r.linhas.map((l) => l.status)).toEqual(['ok', 'aviso', 'ok', 'ok', 'ok', 'aviso', 'ok', 'ok'])
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

// 4ª resposta real, com a lista de 60 alunos: a IA devolveu 52 linhas (o prompt pedia no máximo 50). Antes a importação recusava tudo; agora
// importa os 50 primeiros e deixa 2 para depois. Também mostrou perdas da IA em lista longa (nascimento do Samuel e da Michele, sexo da Michele).
const RESPOSTA_60 = `nome;telefone;email;nascimento;sexo;objetivos
Carla Menezes;(11) 99999-0001;carlinha.menezes@exemplo.com;;;Perder peso|Hipertrofia
João Pedro;(21) 98888-0002;;03/07/1995;;Hipertrofia
Ana Beatriz Lima;;;15/11/89;F;Corrida/maratona
Paulo;;;;;Saúde e qualidade de vida
Marcos Vinícius;(31) 97777-0005;marcos@exemplo.com;;;Condicionamento físico
Fernanda;(11) 96666-0006;;;F;Mobilidade/flexibilidade
Lucas Teixeira;;lucas.teixeira@exemplo.com;25/12/2001;;Hipertrofia
Beatriz Souza;;;;;;
Rafael Costa Neto;(11) 98111-0011;rafael.neto@exemplo.com;08/02/1992;M;Perder peso
Juliana Prado;(11) 98222-0012;;;;Perder peso|Saúde e qualidade de vida
Thiago Alves;(21) 98333-0013;;14/09/97;;Hipertrofia
Marlene;(11) 3333-0014;;;;Mobilidade/flexibilidade
Gustavo Henrique Lopes;;gustavo.hl@exemplo.com;30/05/1985;M;Corrida/maratona
Patrícia Nogueira;(31) 98444-0016;;22/01/1990;F;Hipertrofia
Bruno Carvalho;(11) 98555-0017;;19/04/1988;;Condicionamento físico
Larissa Mendes;(11) 98666-0018;;;;Perder peso
Eduardo Silveira;(41) 98777-0019;eduardo@exemplo.com;11/11/1979;;Saúde e qualidade de vida
Camila Rocha;(11) 98888-0020;;05/06/1996;F;Performance esportiva
André Luiz Barros;(21) 98999-0021;;;;Hipertrofia
Renata Figueiredo;;renata.fig@exemplo.com;17/08/1983;F;Mobilidade/flexibilidade
Diego Martins;(11) 97111-0023;;02/12/2000;;Perder peso
Aline Souza Prado;(11) 97222-0024;;13/03/1994;;Saúde e qualidade de vida
Felipe Ramos;(31) 97333-0025;felipe.ramos@exemplo.com;21/07/1991;;Hipertrofia
Vanessa Teles;(11) 97444-0026;;;;Perder peso
Roberto Gomes;(11) 97555-0027;;;;Saúde e qualidade de vida
Isabela Cunha;;isabela.cunha@exemplo.com;30/09/2002;F;Corrida/maratona
Matheus Oliveira;(41) 97666-0028;;16/01/1999;;Hipertrofia
Tatiane Brito;(11) 97777-0029;;28/02/1987;;Perder peso
Leandro Pires;(21) 97888-0030;leandro@exemplo.com;03/10/1982;M;Condicionamento físico
Priscila Duarte;(11) 97999-0031;;09/07/1993;;Mobilidade/flexibilidade
Henrique Matos;(11) 96111-0032;;;; 
Sandra Regina Lima;(11) 96222-0033;;;;Saúde e qualidade de vida
Vinícius Prates;;vinicius.prates@exemplo.com;20/12/1998;M;Performance esportiva
Natália Ferraz;(31) 96333-0034;;12/04/1990;F;Perder peso|Hipertrofia
Caio Rezende;(11) 96444-0035;;;;Hipertrofia
Mônica Azevedo;(21) 96555-0036;monica.az@exemplo.com;25/05/1975;F;Saúde e qualidade de vida
Otávio Lemos;(11) 96666-0037;;07/11/1996;;Corrida/maratona
Elisa Barbosa;(11) 96777-0038;;18/09/2004;F;Perder peso
Samuel Cardoso;(41) 96888-0039;;;;Condicionamento físico
Débora Moraes;;debora.m@exemplo.com;06/08/1986;F;Mobilidade/flexibilidade
Igor Fonseca;(11) 96999-0040;;15/06/1993;;Hipertrofia
Letícia Sampaio;(21) 95111-0041;;31/01/1997;;Perder peso
Wagner Teixeira;;;;;Saúde e qualidade de vida
Bianca Aragão;(11) 95333-0043;;10/10/1995;F;Mobilidade/flexibilidade
Rodrigo Nascimento;(31) 95444-0044;rodrigo.n@exemplo.com;22/02/1984;;Hipertrofia
Fabiana Torres;(11) 95555-0045;;;;Perder peso|Saúde e qualidade de vida
Gabriel Pinheiro;(11) 95666-0046;;04/05/2001;M;Corrida/maratona
Michele Santana;(11) 95777-0047;;;;Condicionamento físico
Alexandre Freitas;(21) 95888-0048;alexandre.f@exemplo.com;14/07/1978;;Saúde e qualidade de vida
Yasmin Coelho;(11) 95999-0049;;08/03/2003;F;Hipertrofia
Cláudio Andrade;(11) 94111-0050;;;;Perder peso
Jéssica Moura;;jessica.moura@exemplo.com;19/10/1992;F;Performance esportiva`

describe('4ª resposta real: 52 alunos', () => {
  const r = lerPlanilha(RESPOSTA_60, [], '2026-10-28')
  it('importa os 50 primeiros e guarda os 2 últimos para a próxima importação', () => {
    if (!r.ok) throw new Error(r.erro)
    expect(r.linhas).toHaveLength(50)
    expect(r.restantes?.quantidade).toBe(2)
    const resto = lerPlanilha(r.restantes!.texto, [], '2026-10-28')
    if (!resto.ok) throw new Error(resto.erro)
    expect(resto.linhas.map((l) => l.aluno?.name)).toEqual(['Cláudio Andrade', 'Jéssica Moura'])
  })
  it('nenhum dos 50 tem erro; só "Beatriz Souza" entra apenas com o nome', () => {
    if (!r.ok) throw new Error(r.erro)
    expect(r.linhas.filter((l) => l.status === 'erro')).toHaveLength(0)
    const soNome = r.linhas.filter((l) => !l.aluno!.phone && !l.aluno!.email && !l.aluno!.birth_date && !l.aluno!.sex && l.aluno!.objetivos.length === 0).map((l) => l.aluno!.name)
    expect(soNome).toEqual(['Beatriz Souza'])
  })
})

// 5ª resposta real (outra IA), mesma lista de 60: respeitou o limite (49 linhas), AVISOU dos 10 que ficaram de fora e acertou os nascimentos do Samuel e
// da Michele (e o sexo dela). Mas copiou o telefone da Fernanda para a Ana, "consertou" o e-mail quebrado da Ana e pôs o "F" da Fernanda na coluna objetivos.
const RESPOSTA_IA2 = `nome;telefone;email;nascimento;sexo;objetivos
Carla Menezes;(11) 99999-0001;carlinha.menezes@exemplo.com;;;Perder peso|Hipertrofia
João Pedro;(21) 98888-0002;;03/07/1995;;Hipertrofia
Ana Beatriz Lima;(11) 96666-0006;ana.lima@exemplo.com;15/11/89;F;Corrida/maratona
Paulo;;;;;Saúde e qualidade de vida
Marcos Vinícius;(31) 97777-0005;marcos@exemplo.com;;;Condicionamento físico
Fernanda;(11) 96666-0006;;;;Mobilidade/flexibilidade|F
Lucas Teixeira;;lucas.teixeira@exemplo.com;25/12/2001;;
Teste;(11) 95555-0007;;;;
Beatriz Souza;;;;;
Rafael Costa Neto;(11) 98111-0011;rafael.neto@exemplo.com;08/02/1992;M;Perder peso
Juliana Prado;(11) 98222-0012;;;;Perder peso|Saúde e qualidade de vida
Thiago Alves;(21) 98333-0013;;14/09/97;;Hipertrofia
Marlene;;;;;Mobilidade/flexibilidade
Gustavo Henrique Lopes;;gustavo.hl@exemplo.com;30/05/1985;M;Corrida/maratona
Patrícia Nogueira;(31) 98444-0016;;22/01/1990;F;Hipertrofia
Bruno Carvalho;(11) 98555-0017;;19/04/1988;;Condicionamento físico
Larissa Mendes;(11) 98666-0018;;;;Perder peso
Eduardo Silveira;(41) 98777-0019;eduardo@exemplo.com;11/11/1979;;Saúde e qualidade de vida
Camila Rocha;(11) 98888-0020;;05/06/1996;F;Performance esportiva
André Luiz Barros;(21) 98999-0021;;;;Hipertrofia
Renata Figueiredo;;renata.fig@exemplo.com;17/08/1983;F;Mobilidade/flexibilidade
Diego Martins;(11) 97111-0023;;02/12/2000;;Perder peso
Aline Souza Prado;(11) 97222-0024;;13/03/1994;;Saúde e qualidade de vida
Felipe Ramos;(31) 97333-0025;felipe.ramos@exemplo.com;21/07/1991;;Hipertrofia
Vanessa Teles;(11) 97444-0026;;;;Perder peso
Roberto Gomes;(11) 97555-0027;;;;Saúde e qualidade de vida
Isabela Cunha;;isabela.cunha@exemplo.com;30/09/2002;F;Corrida/maratona
Matheus Oliveira;(41) 97666-0028;;16/01/1999;;Hipertrofia
Tatiane Brito;(11) 97777-0029;;28/02/1987;;Perder peso
Leandro Pires;(21) 97888-0030;leandro@exemplo.com;03/10/1982;M;Condicionamento físico
Priscila Duarte;(11) 97999-0031;;09/07/1993;;Mobilidade/flexibilidade
Henrique Matos;(11) 96111-0032;;;;
Sandra Regina Lima;(11) 96222-0033;;;;Saúde e qualidade de vida
Vinícius Prates;;vinicius.prates@exemplo.com;20/12/1998;M;Performance esportiva
Natália Ferraz;(31) 96333-0034;;12/04/1990;F;Perder peso|Hipertrofia
Caio Rezende;(11) 96444-0035;;;;Hipertrofia
Mônica Azevedo;(21) 96555-0036;monica.az@exemplo.com;25/05/1975;F;Saúde e qualidade de vida
Otávio Lemos;(11) 96666-0037;;07/11/1996;;Corrida/maratona
Elisa Barbosa;(11) 96777-0038;;18/09/2004;F;Perder peso
Samuel Cardoso;(41) 96888-0039;;27/03/1989;;Condicionamento físico
Débora Moraes;;debora.m@exemplo.com;06/08/1986;F;Mobilidade/flexibilidade
Igor Fonseca;(11) 96999-0040;;15/06/1993;;Hipertrofia
Letícia Sampaio;(21) 95111-0041;;31/01/1997;;Perder peso
Wagner Teixeira;(11) 95222-0042;;;;Saúde e qualidade de vida
Bianca Aragão;(11) 95333-0043;;10/10/1995;F;Mobilidade/flexibilidade
Rodrigo Nascimento;(31) 95444-0044;rodrigo.n@exemplo.com;22/02/1984;;Hipertrofia
Fabiana Torres;(11) 95555-0045;;;;Perder peso|Saúde e qualidade de vida
Gabriel Pinheiro;(11) 95666-0046;;04/05/2001;M;Corrida/maratona
Michele Santana;(11) 95777-0047;;29/12/1991;F;Condicionamento físico`

describe('5ª resposta real (outra IA): erros que a revisão do app precisa mostrar', () => {
  const r = lerPlanilha(RESPOSTA_IA2, [], '2026-10-28')
  it('lê as 49 linhas, sem erro e sem restantes', () => {
    if (!r.ok) throw new Error(r.erro)
    expect(r.linhas).toHaveLength(49)
    expect(r.restantes).toBeNull()
    expect(r.linhas.filter((l) => l.status === 'erro')).toHaveLength(0)
  })
  it('o telefone copiado (Ana e Fernanda) vira aviso nas duas linhas', () => {
    if (!r.ok) throw new Error(r.erro)
    const ana = r.linhas.find((l) => l.aluno?.name === 'Ana Beatriz Lima')!
    const fernanda = r.linhas.find((l) => l.aluno?.name === 'Fernanda')!
    expect(ana.status).toBe('aviso')
    expect(ana.avisos.join(' ')).toContain('Mesmo telefone de Fernanda')
    expect(fernanda.avisos.join(' ')).toContain('Mesmo telefone de Ana Beatriz Lima')
  })
  it('o "F" na coluna objetivos vira aviso (e o sexo da Fernanda fica vazio para o personal completar)', () => {
    if (!r.ok) throw new Error(r.erro)
    const fernanda = r.linhas.find((l) => l.aluno?.name === 'Fernanda')!
    expect(fernanda.aluno).toMatchObject({ sex: null, objetivos: ['Mobilidade/flexibilidade'] })
    expect(fernanda.avisos.join(' ')).toContain('Objetivo "F" não está na lista do app')
  })
  it('Samuel e Michele voltaram com o nascimento (e ela com o sexo)', () => {
    if (!r.ok) throw new Error(r.erro)
    expect(r.linhas.find((l) => l.aluno?.name === 'Samuel Cardoso')!.aluno!.birth_date).toBe('1989-03-27')
    expect(r.linhas.find((l) => l.aluno?.name === 'Michele Santana')!.aluno).toMatchObject({ birth_date: '1991-12-29', sex: 'F' })
  })
})

describe('prompt: dado de um aluno não vai para outro, não conserta, coluna certa', () => {
  const prompt = montarPromptIA()
  it('traz as três regras novas', () => {
    expect(prompt).toContain('Cada dado pertence SÓ ao aluno da própria entrada')
    expect(prompt).toContain('NÃO conserte telefone, e-mail ou data com erro')
    expect(prompt).toContain('nunca coloque M, F ou Outro na coluna objetivos')
  })
})

// 6ª e 7ª respostas reais (Gemini e ChatGPT) com o prompt já apertado, mesma lista de 60. Gemini: 49 linhas, avisou dos 10 que ficaram de fora, acertou
// Samuel e Michele, sem telefone trocado e sem "consertar" e-mail; manteve a linha lixo "SOMA(A1:A2) Teste" e largou o fixo da Marlene.
// ChatGPT: sem a linha lixo e com o fixo da Marlene, mas largou o nascimento do Samuel. O app avisa o nome estranho; omissão de dado a IA não deixa rastro.
const RESPOSTA_GEMINI = `nome;telefone;email;nascimento;sexo;objetivos
Carla Menezes;(11) 99999-0001;carlinha.menezes@exemplo.com;;;Perder peso|Hipertrofia
João Pedro;(21) 98888-0002;;03/07/1995;;Hipertrofia
Ana Beatriz Lima;;;15/11/89;F;Corrida/maratona
Paulo;;;;;Saúde e qualidade de vida
Marcos Vinícius;(31) 97777-0005;marcos@exemplo.com;;;Condicionamento físico
Fernanda;(11) 96666-0006;;;F;Mobilidade/flexibilidade
Lucas Teixeira;;lucas.teixeira@exemplo.com;25/12/2001;;Hipertrofia
SOMA(A1:A2) Teste;(11) 95555-0007;;;;
Beatriz Souza;;;;;
Rafael Costa Neto;(11) 98111-0011;rafael.neto@exemplo.com;08/02/1992;M;Perder peso
Juliana Prado;(11) 98222-0012;;;;Perder peso|Saúde e qualidade de vida
Thiago Alves;(21) 98333-0013;;14/09/97;;Hipertrofia
Marlene;;;;;Mobilidade/flexibilidade
Gustavo Henrique Lopes;;gustavo.hl@exemplo.com;30/05/1985;M;Corrida/maratona
Patrícia Nogueira;(31) 98444-0016;;22/01/1990;F;Hipertrofia
Bruno Carvalho;(11) 98555-0017;;19/04/1988;;Condicionamento físico
Larissa Mendes;(11) 98666-0018;;;;Perder peso
Eduardo Silveira;(41) 98777-0019;eduardo@exemplo.com;11/11/1979;;Saúde e qualidade de vida
Camila Rocha;(11) 98888-0020;;05/06/1996;F;Performance esportiva
André Luiz Barros;(21) 98999-0021;;;;Hipertrofia
Renata Figueiredo;;renata.fig@exemplo.com;17/08/1983;F;Mobilidade/flexibilidade
Diego Martins;(11) 97111-0023;;02/12/2000;;Perder peso
Aline Souza Prado;(11) 97222-0024;;13/03/1994;;Saúde e qualidade de vida
Felipe Ramos;(31) 97333-0025;felipe.ramos@exemplo.com;21/07/1991;;Hipertrofia
Vanessa Teles;(11) 97444-0026;;;;Perder peso
Roberto Gomes;(11) 97555-0027;;;;Saúde e qualidade de vida
Isabela Cunha;;isabela.cunha@exemplo.com;30/09/2002;F;Corrida/maratona
Matheus Oliveira;(41) 97666-0028;;16/01/1999;;Hipertrofia
Tatiane Brito;(11) 97777-0029;;28/02/1987;;Perder peso
Leandro Pires;(21) 97888-0030;leandro@exemplo.com;03/10/1982;M;Condicionamento físico
Priscila Duarte;(11) 97999-0031;;09/07/1993;;Mobilidade/flexibilidade
Henrique Matos;(11) 96111-0032;;;;
Sandra Regina Lima;(11) 96222-0033;;;;Saúde e qualidade de vida
Vinícius Prates;;vinicius.prates@exemplo.com;20/12/1998;M;Performance esportiva
Natália Ferraz;(31) 96333-0034;;12/04/1990;F;Perder peso|Hipertrofia
Caio Rezende;(11) 96444-0035;;;;Hipertrofia
Mônica Azevedo;(21) 96555-0036;monica.az@exemplo.com;25/05/1975;F;Saúde e qualidade de vida
Otávio Lemos;(11) 96666-0037;;07/11/1996;;Corrida/maratona
Elisa Barbosa;(11) 96777-0038;;18/09/2004;F;Perder peso
Samuel Cardoso;(41) 96888-0039;;27/03/1989;;Condicionamento físico
Débora Moraes;;debora.m@exemplo.com;06/08/1986;F;Mobilidade/flexibilidade
Igor Fonseca;(11) 96999-0040;;15/06/1993;;Hipertrofia
Letícia Sampaio;(21) 95111-0041;;31/01/1997;;Perder peso
Wagner Teixeira;(11) 95222-0042;;;;Saúde e qualidade de vida
Bianca Aragão;(11) 95333-0043;;10/10/1995;F;Mobilidade/flexibilidade
Rodrigo Nascimento;(31) 95444-0044;rodrigo.n@exemplo.com;22/02/1984;;Hipertrofia
Fabiana Torres;(11) 95555-0045;;;;Perder peso|Saúde e qualidade de vida
Gabriel Pinheiro;(11) 95666-0046;;04/05/2001;M;Corrida/maratona
Michele Santana;(11) 95777-0047;;29/12/1991;F;Condicionamento físico`

describe('6ª resposta real (Gemini, prompt apertado)', () => {
  const r = lerPlanilha(RESPOSTA_GEMINI, [], '2026-10-28')
  it('49 linhas, sem erro, sem restantes e sem telefone repetido entre alunos', () => {
    if (!r.ok) throw new Error(r.erro)
    expect(r.linhas).toHaveLength(49)
    expect(r.restantes).toBeNull()
    expect(r.linhas.filter((l) => l.status === 'erro')).toHaveLength(0)
    expect(r.linhas.flatMap((l) => l.avisos).filter((a) => a.startsWith('Mesmo telefone'))).toHaveLength(0)
  })
  it('a Ana volta sem o telefone da Fernanda e sem e-mail "consertado"; a Fernanda com o F na coluna certa', () => {
    if (!r.ok) throw new Error(r.erro)
    expect(r.linhas.find((l) => l.aluno?.name === 'Ana Beatriz Lima')!.aluno).toMatchObject({ phone: null, email: null, birth_date: '1989-11-15', sex: 'F' })
    expect(r.linhas.find((l) => l.aluno?.name === 'Fernanda')!.aluno).toMatchObject({ sex: 'F', objetivos: ['Mobilidade/flexibilidade'] })
  })
  it('a linha lixo "SOMA(A1:A2) Teste" é a única com aviso de nome estranho', () => {
    if (!r.ok) throw new Error(r.erro)
    const comAviso = r.linhas.filter((l) => l.avisos.some((a) => a.includes('parece sobra de planilha'))).map((l) => l.aluno!.name)
    expect(comAviso).toEqual(['SOMA(A1:A2) Teste'])
  })
})
