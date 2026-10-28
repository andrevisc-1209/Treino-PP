// Importação de alunos por planilha (CSV). Só dados BÁSICOS: nome, telefone, e-mail, nascimento, sexo e objetivos. Nada de saúde (lesão,
// cirurgia, medicamentos, altura): isso só entra com o consentimento do aluno. Sem cobrança nem horários (completam na ficha).
// Regras puras (sem I/O): leitura, validação, duplicados. A tela só mostra o resultado.

import { OBJETIVOS } from '../opcoes'
import { mascararTelefone, validarTelefone } from '@/lib/telefone'
import { lerCsv, serializarCsv } from './csv'

export const LIMITE_IMPORTACAO = 50
/** Quantas linhas do começo são olhadas atrás do cabeçalho (título solto, linha em branco etc.). */
const LINHAS_PARA_ACHAR_CABECALHO = 5
export const TAMANHO_MAXIMO_ARQUIVO = 200 * 1024 // 200 KB: 50 alunos cabem com folga

/** Colunas do modelo, na ordem. Só "nome" é obrigatório. */
export const COLUNAS = ['nome', 'telefone', 'email', 'nascimento', 'sexo', 'objetivos'] as const
export type Coluna = (typeof COLUNAS)[number]

export const MODELO_CSV =
  'nome;telefone;email;nascimento;sexo;objetivos\r\n' +
  'Maria Exemplo;(11) 91234-5678;maria@exemplo.com;15/03/1990;F;Hipertrofia|Saúde e qualidade de vida\r\n'

/** Sem acento, minúsculo, só letras e números: compara cabeçalhos e nomes sem se importar com acento ou caixa. */
export const simplificar = (s: string): string =>
  s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()

const SINONIMOS: Record<Coluna, string[]> = {
  nome: ['nome', 'aluno', 'nome do aluno', 'nome completo'],
  telefone: ['telefone', 'celular', 'whatsapp', 'fone', 'tel'],
  email: ['email', 'e mail'],
  nascimento: ['nascimento', 'data de nascimento', 'data nascimento', 'nasc', 'data nasc'],
  sexo: ['sexo', 'genero'],
  objetivos: ['objetivos', 'objetivo', 'meta', 'metas'],
}

/** Mapeia o cabeçalho da planilha para as colunas conhecidas. `colunas` = posição de cada uma; `ignoradas` = cabeçalhos que não usamos. */
export function mapearCabecalho(cabecalho: string[]): { colunas: Partial<Record<Coluna, number>>; ignoradas: string[] } {
  const colunas: Partial<Record<Coluna, number>> = {}
  const ignoradas: string[] = []
  cabecalho.forEach((titulo, i) => {
    const t = simplificar(titulo)
    if (!t) return
    const achada = COLUNAS.find((c) => SINONIMOS[c].includes(t))
    if (achada && colunas[achada] === undefined) colunas[achada] = i
    else ignoradas.push(titulo.trim())
  })
  return { colunas, ignoradas }
}

/** Data em dd/mm/aaaa, d/m/aaaa, dd-mm-aaaa, aaaa-mm-dd ou dd/mm/aa (aa: 00–29 = 2000+, resto 1900+). Devolve aaaa-mm-dd ou null. */
export function normalizarNascimento(valor: string): string | null {
  const v = valor.trim()
  let d: number, m: number, a: number
  let r = /^(\d{4})-(\d{1,2})-(\d{1,2})$/.exec(v)
  if (r) [a, m, d] = [Number(r[1]), Number(r[2]), Number(r[3])]
  else if ((r = /^(\d{1,2})[/.-](\d{1,2})[/.-](\d{2}|\d{4})$/.exec(v))) {
    d = Number(r[1])
    m = Number(r[2])
    a = Number(r[3])
    if (r[3].length === 2) a += a <= 29 ? 2000 : 1900
  } else return null
  const data = new Date(Date.UTC(a, m - 1, d))
  if (data.getUTCFullYear() !== a || data.getUTCMonth() !== m - 1 || data.getUTCDate() !== d) return null
  return `${String(a).padStart(4, '0')}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`
}

export function normalizarSexo(valor: string): 'M' | 'F' | 'outro' | null {
  const v = simplificar(valor)
  if (['m', 'masc', 'masculino', 'homem'].includes(v)) return 'M'
  if (['f', 'fem', 'feminino', 'mulher'].includes(v)) return 'F'
  if (['o', 'outro', 'outros', 'nao binario'].includes(v)) return 'outro'
  return null
}

/** Idade em anos completos em `hojeISO` (aaaa-mm-dd). */
function anos(nascISO: string, hojeISO: string): number {
  const [a, m, d] = nascISO.split('-').map(Number)
  const [ha, hm, hd] = hojeISO.split('-').map(Number)
  return ha - a - (hm < m || (hm === m && hd < d) ? 1 : 0)
}

/** Objetivo da lista do app pelo nome inteiro ou, se tiver 4+ letras, por um início que só combina com um deles ("Saúde" → "Saúde e qualidade de vida"). */
function acharObjetivo(texto: string): (typeof OBJETIVOS)[number] | undefined {
  const t = simplificar(texto)
  const exato = OBJETIVOS.find((o) => simplificar(o) === t)
  if (exato || t.length < 4) return exato
  const porInicio = OBJETIVOS.filter((o) => simplificar(o).startsWith(t))
  return porInicio.length === 1 ? porInicio[0] : undefined
}

/**
 * Objetivos separados por "|" (ou ";" se o arquivo não usa ";" como separador). **Só entra o que está na lista do app**: o que não casa
 * (e o "Outros", que pede uma descrição) fica de fora e volta em `ignorados` para avisar. Nada digitado livremente vai para a base.
 */
export function normalizarObjetivos(valor: string): { objetivos: string[]; ignorados: string[] } {
  const itens = valor
    .split(/[|\n]/)
    .flatMap((p) => (acharObjetivo(p) ? [p] : p.split(';')))
    .map((p) => p.trim())
    .filter(Boolean)
  const objetivos: string[] = []
  const ignorados: string[] = []
  for (const item of itens) {
    const achado = acharObjetivo(item)
    if (achado && achado !== 'Outros') {
      if (!objetivos.includes(achado)) objetivos.push(achado)
    } else ignorados.push(item.slice(0, 40))
  }
  return { objetivos, ignorados }
}

export type AlunoImportavel = {
  name: string
  phone: string | null
  email: string | null
  birth_date: string | null
  sex: 'M' | 'F' | 'outro' | null
  /** só valores da lista do app (OBJETIVOS), nunca texto livre */
  objetivos: string[]
}

export type StatusLinha = 'ok' | 'aviso' | 'duplicado' | 'erro'

export type LinhaImportada = {
  /** número da linha na planilha (a 1ª linha de dados é a 2) */
  linha: number
  aluno: AlunoImportavel | null
  status: StatusLinha
  /** erros bloqueiam a linha; avisos explicam o que ficou de fora */
  erros: string[]
  avisos: string[]
}

export type ExistenteParaDuplicado = { name: string; phone: string | null }

const soDigitos = (s: string | null | undefined) => (s ?? '').replace(/\D/g, '')
/** Mesmo aluno = mesmo nome (sem acento/caixa) e mesmo telefone (ou os dois sem telefone). */
const chaveDuplicado = (nome: string, telefone: string | null | undefined) => `${simplificar(nome)}|${soDigitos(telefone)}`

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/
/** Dígitos e símbolos que quase nunca fazem parte do nome de uma pessoa. Só vira aviso. */
const NOME_ESTRANHO = /[0-9=()[\]{}<>:@#$%^*_+~|\\]/

export type ResultadoLeitura =
  | { ok: false; erro: string }
  | {
      ok: true
      linhas: LinhaImportada[]
      colunasIgnoradas: string[]
      semDados: false
      /** alunos que passaram do limite: ficam para a próxima importação (com o cabeçalho, prontos para colar de novo) */
      restantes: { quantidade: number; texto: string } | null
    }

/**
 * Lê o texto da planilha e valida linha a linha. Erro SÓ quando não há nome (ou a planilha não tem a coluna "nome" / passa do limite).
 * Telefone, e-mail, nascimento e sexo inválidos não travam a linha: o campo fica vazio e vira aviso.
 */
export function lerPlanilha(texto: string, existentes: ExistenteParaDuplicado[], hojeISO: string): ResultadoLeitura {
  const tabela = lerCsv(texto)
  if (tabela.length === 0) return { ok: false, erro: 'A planilha está vazia.' }
  // o cabeçalho costuma ser a 1ª linha, mas o Google Planilhas e o Excel às vezes põem um título antes: procura nas primeiras linhas
  const posCabecalho = tabela.slice(0, LINHAS_PARA_ACHAR_CABECALHO).findIndex((l) => mapearCabecalho(l).colunas.nome !== undefined)
  if (posCabecalho < 0) return { ok: false, erro: 'Não achei a coluna "nome" nas primeiras linhas. Use o modelo para baixar a planilha certa.' }
  const { colunas, ignoradas } = mapearCabecalho(tabela[posCabecalho])
  const todos = tabela.slice(posCabecalho + 1)
  const dados = todos.slice(0, LIMITE_IMPORTACAO)
  const restantes = todos.length > LIMITE_IMPORTACAO ? { quantidade: todos.length - LIMITE_IMPORTACAO, texto: serializarCsv([tabela[posCabecalho], ...todos.slice(LIMITE_IMPORTACAO)]) } : null
  if (todos.length === 0) return { ok: false, erro: 'A planilha só tem o cabeçalho, sem nenhum aluno.' }

  const existentesChaves = new Set(existentes.map((e) => chaveDuplicado(e.name, e.phone)))
  const vistasNoArquivo = new Set<string>()
  const celula = (cols: string[], c: Coluna) => (colunas[c] === undefined ? '' : (cols[colunas[c]!] ?? '').trim())

  const linhas = dados.map((cols, i): LinhaImportada => {
    const linha = posCabecalho + i + 2 // número da linha na planilha (a do cabeçalho é posCabecalho + 1)
    const erros: string[] = []
    const avisos: string[] = []
    const nome = celula(cols, 'nome').replace(/\s+/g, ' ')
    if (!nome) return { linha, aluno: null, status: 'erro', erros: ['Sem nome.'], avisos }
    if (nome.length > 120) return { linha, aluno: null, status: 'erro', erros: ['Nome com mais de 120 letras.'], avisos }

    // sobra de planilha/IA no lugar do nome ("SOMA(A1:A2) Teste", "Maria 2", "=ALGO"): entra, mas a revisão chama a atenção
    if (NOME_ESTRANHO.test(nome)) avisos.push('O nome tem número ou símbolo (parece sobra de planilha): confira antes de importar.')

    let phone: string | null = null
    const tel = celula(cols, 'telefone')
    if (tel) {
      if (validarTelefone(tel)) phone = mascararTelefone(tel)
      else avisos.push(`Telefone "${tel}" inválido: o aluno entra sem telefone.`)
    }

    let email: string | null = null
    const em = celula(cols, 'email')
    if (em) {
      if (EMAIL.test(em) && em.length <= 254) email = em.toLowerCase()
      else avisos.push(`E-mail "${em}" inválido: o aluno entra sem e-mail.`)
    }

    let birth_date: string | null = null
    const nasc = celula(cols, 'nascimento')
    if (nasc) {
      const iso = normalizarNascimento(nasc)
      if (!iso) avisos.push(`Data de nascimento "${nasc}" inválida (use dd/mm/aaaa): o aluno entra sem data.`)
      else if (iso > hojeISO) avisos.push('Data de nascimento no futuro: o aluno entra sem data.')
      else if (anos(iso, hojeISO) > 100) avisos.push('Data de nascimento antes de 100 anos atrás: o aluno entra sem data.')
      else birth_date = iso
    }

    let sex: AlunoImportavel['sex'] = null
    const sx = celula(cols, 'sexo')
    if (sx) {
      sex = normalizarSexo(sx)
      if (!sex) avisos.push(`Sexo "${sx}" não reconhecido (use M, F ou Outro): o aluno entra sem essa informação.`)
    }

    const { objetivos, ignorados } = normalizarObjetivos(celula(cols, 'objetivos'))
    if (ignorados.length > 0) avisos.push(`Objetivo "${ignorados.join('", "')}" não está na lista do app: ficou de fora (escolha na ficha do aluno).`)

    const aluno: AlunoImportavel = { name: nome, phone, email, birth_date, sex, objetivos }
    const chave = chaveDuplicado(nome, phone)
    let status: StatusLinha = avisos.length > 0 ? 'aviso' : 'ok'
    if (existentesChaves.has(chave)) {
      status = 'duplicado'
      avisos.unshift('Já existe um aluno com esse nome e telefone.')
    } else if (vistasNoArquivo.has(chave)) {
      status = 'duplicado'
      avisos.unshift('Repetido na própria planilha (mesmo nome e telefone).')
    }
    vistasNoArquivo.add(chave)
    return { linha, aluno, status, erros, avisos }
  })
  avisarTelefoneRepetido(linhas, existentes)
  return { ok: true, linhas, colunasIgnoradas: ignoradas, semDados: false, restantes }
}

/**
 * Mesmo telefone para alunos DIFERENTES (na lista ou já cadastrados): costuma ser a IA ou a planilha trocando o número de uma pessoa pela de outra
 * (já aconteceu: a Ana saiu com o telefone da Fernanda). Pode ser legítimo (pai e filho), então é só aviso, nunca erro.
 */
function avisarTelefoneRepetido(linhas: LinhaImportada[], existentes: ExistenteParaDuplicado[]) {
  const grupos = new Map<string, LinhaImportada[]>()
  for (const l of linhas) {
    const d = soDigitos(l.aluno?.phone)
    if (!d || l.status === 'erro' || l.status === 'duplicado') continue
    grupos.set(d, [...(grupos.get(d) ?? []), l])
  }
  const avisar = (l: LinhaImportada, texto: string) => {
    l.avisos.push(texto)
    if (l.status === 'ok') l.status = 'aviso'
  }
  for (const [digitos, grupo] of grupos) {
    const nomes = new Set(grupo.map((l) => simplificar(l.aluno!.name)))
    if (nomes.size > 1) {
      for (const l of grupo) {
        const outros = grupo.filter((o) => simplificar(o.aluno!.name) !== simplificar(l.aluno!.name)).map((o) => `${o.aluno!.name} (linha ${o.linha})`)
        avisar(l, `Mesmo telefone de ${outros.join(', ')}: confira se o número não foi trocado.`)
      }
    }
    const jaCadastrados = existentes.filter((e) => soDigitos(e.phone) === digitos)
    for (const l of grupo) {
      const outros = jaCadastrados.filter((e) => simplificar(e.name) !== simplificar(l.aluno!.name))
      if (outros.length > 0) avisar(l, `Já existe o aluno ${outros.map((e) => e.name).join(', ')} com este telefone: confira se o número não foi trocado.`)
    }
  }
}

/** Linhas que já vêm marcadas para importar: tudo que não é erro nem duplicado. */
export const selecionadasPorPadrao = (linhas: LinhaImportada[]): number[] => linhas.filter((l) => l.status === 'ok' || l.status === 'aviso').map((l) => l.linha)

export function resumoLeitura(linhas: LinhaImportada[]) {
  const conta = (s: StatusLinha) => linhas.filter((l) => l.status === s).length
  return { total: linhas.length, ok: conta('ok'), aviso: conta('aviso'), duplicado: conta('duplicado'), erro: conta('erro') }
}
