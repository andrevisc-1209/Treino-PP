/** Contrato de prestação de serviço do aluno: dados, regras e texto das cláusulas (puro, sem I/O). O PDF é desenhado em pdf.ts. */
import { mascararCPF } from '@/lib/cpf'

export const MODALIDADES_CONTRATO = ['Musculação', 'Corrida', 'Natação', 'Ciclismo', 'Brick (triathlon)'] as const

export type FormaContrato = 'por_aula' | 'mensal' | 'pacote'
export const FORMAS_CONTRATO: { valor: FormaContrato; rotulo: string }[] = [
  { valor: 'por_aula', rotulo: 'Por aula' },
  { valor: 'mensal', rotulo: 'Mensal' },
  { valor: 'pacote', rotulo: 'Pacote de aulas' },
]

/** O Código de Defesa do Consumidor (art. 52, § 1º) limita a multa por atraso a 2% da prestação: acima disso o app avisa. */
export const LIMITE_MULTA = 2

export type RegrasContrato = {
  antecedenciaHoras: number
  faltaCobrada: boolean
  reposicao: 'mesmo_mes' | 'prazo' | 'nenhuma'
  reposicaoDias: number
  multaAtiva: boolean
  multaPct: number
  jurosPct: number
  marcacaoPrevia: boolean
  horariosConformeAgenda: boolean
  perdaDoHorario: boolean
  reajuste: boolean
  reajusteAvisoDias: number
  /** só vale na forma mensal */
  trancamento: boolean
  trancamentoAvisoDias: number
  trancamentoTaxaPct: number
}

export const REGRAS_PADRAO: RegrasContrato = {
  antecedenciaHoras: 12,
  faltaCobrada: true,
  reposicao: 'mesmo_mes',
  reposicaoDias: 30,
  multaAtiva: true,
  multaPct: 2,
  jurosPct: 1,
  marcacaoPrevia: true,
  horariosConformeAgenda: true,
  perdaDoHorario: false,
  reajuste: false,
  reajusteAvisoDias: 30,
  trancamento: false,
  trancamentoAvisoDias: 30,
  trancamentoTaxaPct: 0,
}

export type DadosContrato = {
  personal: { nome: string; cpf: string | null; cidade: string | null; uf: string | null }
  aluno: { nome: string; cpf: string | null; endereco: string | null; telefone: string | null; email: string | null }
  /** só quando o aluno é menor de idade; nunca é gravado */
  responsavel: { nome: string | null; cpf: string | null } | null
  modalidades: string[]
  local: string
  diasHorarios: string
  /** AAAA-MM-DD */
  inicio: string
  forma: FormaContrato
  valorAula: number | null
  valorMensal: number | null
  qtdAulas: number | null
  valorPacote: number | null
  validadeDias: number | null
  vencimentoDia: number | null
  regras: RegrasContrato
  /** cidade/UF do foro e da assinatura (padrão: a do perfil do personal) */
  foro: string
  /** AAAA-MM-DD */
  geradoEm: string
}

export type ClausulaContrato = { titulo: string; paragrafos: string[] }
export type TextoContrato = { titulo: string; abertura: string; partes: string[]; clausulas: ClausulaContrato[]; fecho: string; localData: string; assinaturas: { rotulo: string; nome: string }[] }

const LINHA = '________________'
const MESES = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro']

export const ou = (v: string | null | undefined, vazio = LINHA): string => (v && v.trim() ? v.trim() : vazio)

export function moeda(n: number | null | undefined): string {
  if (n === null || n === undefined || !Number.isFinite(n)) return 'R$ ____,__'
  return n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }).replace(/ /g, ' ')
}

/** "29 de outubro de 2026" */
export function dataPorExtenso(iso: string): string {
  const [a, m, d] = iso.slice(0, 10).split('-').map(Number)
  if (!a || !m || !d) return LINHA
  return `${d} de ${MESES[m - 1]} de ${a}`
}

const dataCurta = (iso: string): string => iso.slice(0, 10).split('-').reverse().join('/')
const cpfTexto = (cpf: string | null): string => (cpf ? mascararCPF(cpf) : '___.___.___-__')
const pct = (n: number): string => String(n).replace('.', ',')

/** Menor de 18 anos na data (precisa do responsável legal). Sem nascimento = não sabe, devolve false. */
export function ehMenorDeIdade(nascimentoISO: string | null | undefined, hojeISO: string): boolean {
  if (!nascimentoISO) return false
  const [a, m, d] = nascimentoISO.slice(0, 10).split('-').map(Number)
  const [ah, mh, dh] = hojeISO.slice(0, 10).split('-').map(Number)
  if (!a || !ah) return false
  const anos = ah - a - (mh < m || (mh === m && dh < d) ? 1 : 0)
  return anos < 18
}

/** O que impede de gerar: o contrato precisa, no mínimo, de modalidade e do valor da forma escolhida. */
export function problemasDoContrato(d: DadosContrato): string[] {
  const p: string[] = []
  if (d.modalidades.length === 0) p.push('Escolha ao menos uma modalidade.')
  if (d.forma === 'por_aula' && !(d.valorAula && d.valorAula > 0)) p.push('Informe o valor da aula.')
  if (d.forma === 'mensal' && !(d.valorMensal && d.valorMensal > 0)) p.push('Informe o valor da mensalidade.')
  if (d.forma === 'pacote') {
    if (!(d.qtdAulas && d.qtdAulas > 0)) p.push('Informe a quantidade de aulas do pacote.')
    if (!(d.valorPacote && d.valorPacote > 0)) p.push('Informe o valor do pacote.')
    if (!(d.validadeDias && d.validadeDias > 0)) p.push('Informe a validade do pacote em dias.')
  }
  if (d.vencimentoDia !== null && (d.vencimentoDia < 1 || d.vencimentoDia > 31)) p.push('O dia de vencimento vai de 1 a 31.')
  return p
}

/** Avisos que não impedem: o personal decide, mas precisa saber. */
export function avisosDoContrato(d: DadosContrato): string[] {
  const a: string[] = []
  if (d.regras.multaAtiva && d.regras.multaPct > LIMITE_MULTA) {
    a.push(`Multa de ${pct(d.regras.multaPct)}% está acima de 2%, o limite do Código de Defesa do Consumidor para multa por atraso. Cláusulas acima disso podem ser contestadas.`)
  }
  if (d.forma === 'mensal' && d.regras.trancamento && d.regras.trancamentoTaxaPct >= 50) {
    a.push('Taxa de trancamento alta pode ser contestada; vale conferir com um advogado.')
  }
  if (!d.aluno.cpf) a.push('Sem o CPF do aluno, o contrato sai com uma linha em branco para preencher à mão.')
  return a
}

function vencimentoTexto(d: DadosContrato): string {
  return d.vencimentoDia ? `todo dia ${d.vencimentoDia}` : 'em data a combinar entre as partes'
}

function clausulaObjeto(d: DadosContrato): ClausulaContrato {
  return {
    titulo: 'DO OBJETO',
    paragrafos: [
      `O(A) CONTRATADO(A) prestará ao(à) CONTRATANTE serviços de orientação e acompanhamento de treinamento físico personalizado, nas modalidades: ${d.modalidades.join(', ') || LINHA}.`,
      `As aulas serão realizadas em ${ou(d.local, 'local a combinar entre as partes')}. Os treinos à distância, quando houver, seguem as orientações enviadas pelo(a) CONTRATADO(A).`,
    ],
  }
}

function clausulaValor(d: DadosContrato): ClausulaContrato {
  const r = d.regras
  const p: string[] = []
  if (d.forma === 'por_aula') {
    p.push(`Cada aula realizada custa ${moeda(d.valorAula)}. As aulas realizadas no mês são somadas e cobradas ${d.vencimentoDia ? `com vencimento todo dia ${d.vencimentoDia}` : 'em data a combinar entre as partes'}.`)
  } else if (d.forma === 'mensal') {
    p.push(`A mensalidade é de ${moeda(d.valorMensal)}, com vencimento ${vencimentoTexto(d)}.`)
  } else {
    p.push(
      `O(A) CONTRATANTE adquire um pacote de ${d.qtdAulas ?? '__'} aulas pelo valor de ${moeda(d.valorPacote)}, que poderá ser utilizado em até ${d.validadeDias ?? '__'} dias, contados de ${dataCurta(d.inicio)}. Findo esse prazo, as aulas não utilizadas perdem a validade, salvo acordo entre as partes.`,
    )
    p.push(`O pagamento do pacote será feito ${d.vencimentoDia ? `até o dia ${d.vencimentoDia}` : 'em data a combinar entre as partes'}.`)
  }
  p.push('O pagamento será feito por Pix ou outra forma combinada entre as partes.')
  if (r.multaAtiva && (r.multaPct > 0 || r.jurosPct > 0)) {
    const partes = [r.multaPct > 0 ? `multa de ${pct(r.multaPct)}% sobre o valor em atraso` : null, r.jurosPct > 0 ? `juros de ${pct(r.jurosPct)}% ao mês` : null].filter(Boolean)
    p.push(`Em caso de atraso, incidirão ${partes.join(' e ')}, até o efetivo pagamento.`)
  }
  return { titulo: 'DO VALOR E DO PAGAMENTO', paragrafos: p }
}

function clausulaHorarios(d: DadosContrato): ClausulaContrato | null {
  const r = d.regras
  const p: string[] = []
  if (r.horariosConformeAgenda) p.push('Os dias e horários das aulas serão combinados entre as partes, conforme a disponibilidade da agenda do(a) CONTRATADO(A).')
  if (d.diasHorarios.trim()) p.push(`Ficam inicialmente combinados: ${d.diasHorarios.trim()}.`)
  if (r.marcacaoPrevia) p.push('Todos os treinos devem ser previamente agendados.')
  return p.length ? { titulo: 'DOS HORÁRIOS E DA MARCAÇÃO DAS AULAS', paragrafos: p } : null
}

function clausulaCancelamento(d: DadosContrato): ClausulaContrato {
  const r = d.regras
  const p: string[] = [`Se não puder comparecer, o(a) CONTRATANTE deverá avisar o(a) CONTRATADO(A) com antecedência mínima de ${r.antecedenciaHoras} horas.`]
  p.push(
    r.faltaCobrada
      ? 'A aula cancelada fora desse prazo, ou sem aviso, será contabilizada como realizada, cobrada normalmente e não poderá ser reposta.'
      : 'A aula cancelada fora desse prazo, ou sem aviso, não será cobrada, e sua reposição ficará a critério do(a) CONTRATADO(A).',
  )
  p.push('As aulas canceladas pelo(a) CONTRATADO(A) serão repostas sem custo, em horário combinado entre as partes.')
  if (r.reposicao === 'mesmo_mes') p.push('As aulas avisadas dentro do prazo deverão ser repostas no mesmo mês, em horário combinado; se não forem repostas no mês, serão perdidas.')
  else if (r.reposicao === 'prazo') p.push(`As aulas avisadas dentro do prazo deverão ser repostas em até ${r.reposicaoDias} dias, em horário combinado; se não forem repostas nesse prazo, serão perdidas.`)
  else p.push('As aulas não realizadas por iniciativa do(a) CONTRATANTE não serão repostas.')
  if (r.perdaDoHorario) p.push('A recorrência de faltas poderá levar à perda do horário reservado ao(à) CONTRATANTE.')
  return { titulo: 'DO CANCELAMENTO, DAS FALTAS E DA REPOSIÇÃO', paragrafos: p }
}

function clausulaReajuste(d: DadosContrato): ClausulaContrato | null {
  if (!d.regras.reajuste) return null
  return {
    titulo: 'DO REAJUSTE',
    paragrafos: [
      `O valor poderá ser reajustado, mediante aviso prévio de ${d.regras.reajusteAvisoDias} dias, em razão de mudanças na frequência semanal, no deslocamento ou nos custos da prestação do serviço.`,
      'O reajuste não alcança pacotes já pagos.',
    ],
  }
}

function clausulaSaude(d: DadosContrato): ClausulaContrato {
  const p = [
    'O(A) CONTRATANTE declara estar apto(a) à prática de atividade física e se compromete a informar ao(à) CONTRATADO(A) qualquer alteração em seu estado de saúde, sendo recomendada a avaliação médica prévia.',
    'As informações de saúde necessárias ao acompanhamento são tratadas em termo de consentimento específico, separado deste contrato.',
  ]
  if (d.responsavel) p.push('O(A) responsável legal assina este contrato em nome do(a) CONTRATANTE menor de idade e autoriza a prática das atividades.')
  return { titulo: 'DA SAÚDE E DA RESPONSABILIDADE', paragrafos: p }
}

function clausulaVigencia(d: DadosContrato): ClausulaContrato {
  return {
    titulo: 'DA VIGÊNCIA',
    paragrafos: [
      d.forma === 'pacote'
        ? `Este contrato começa em ${dataCurta(d.inicio)} e vigora até o término do pacote ou de sua validade, o que ocorrer primeiro.`
        : `Este contrato começa em ${dataCurta(d.inicio)} e vigora por prazo indeterminado.`,
    ],
  }
}

function clausulaRescisao(d: DadosContrato): ClausulaContrato {
  const r = d.regras
  const p: string[] = []
  if (d.forma === 'mensal' && r.trancamento) {
    p.push(`Qualquer das partes pode encerrar ou trancar o contrato mediante aviso prévio de ${r.trancamentoAvisoDias} dias.`)
    if (r.trancamentoTaxaPct > 0) p.push(`Se o aviso for dado fora desse prazo, será cobrada taxa de ${pct(r.trancamentoTaxaPct)}% do valor da mensalidade.`)
  } else {
    p.push('Qualquer das partes pode encerrar este contrato mediante comunicação prévia, quitando-se os valores devidos até a data do encerramento.')
  }
  return { titulo: 'DO TRANCAMENTO E DA RESCISÃO', paragrafos: p }
}

const ORDINAL = (n: number): string => `${n}ª`

/** Monta o contrato: cláusulas ligadas, numeradas e com os valores preenchidos. Dado que falta vira linha em branco. */
export function montarContrato(d: DadosContrato): TextoContrato {
  const partes = [
    `CONTRATADO(A): ${ou(d.personal.nome)}, CPF ${cpfTexto(d.personal.cpf)}${d.personal.cidade ? `, de ${d.personal.cidade}${d.personal.uf ? `/${d.personal.uf}` : ''}` : ''}.`,
    `CONTRATANTE: ${ou(d.aluno.nome)}, CPF ${cpfTexto(d.aluno.cpf)}, residente em ${ou(d.aluno.endereco)}, telefone ${ou(d.aluno.telefone)}, e-mail ${ou(d.aluno.email)}.`,
  ]
  if (d.responsavel) partes.push(`RESPONSÁVEL LEGAL do(a) CONTRATANTE: ${ou(d.responsavel.nome)}, CPF ${cpfTexto(d.responsavel.cpf)}.`)

  const base: (ClausulaContrato | null)[] = [
    clausulaObjeto(d),
    clausulaValor(d),
    clausulaHorarios(d),
    clausulaCancelamento(d),
    clausulaReajuste(d),
    clausulaSaude(d),
    clausulaVigencia(d),
    clausulaRescisao(d),
    { titulo: 'DOS DADOS PESSOAIS', paragrafos: ['Os dados pessoais das partes serão tratados apenas para a execução deste contrato e a gestão dos treinos, conforme a Lei nº 13.709/2018 (LGPD).'] },
    {
      titulo: 'DO FORO',
      paragrafos: [`Fica eleito o foro da comarca de ${ou(d.foro)} para dirimir quaisquer dúvidas deste contrato.`],
    },
  ]
  const clausulas = base
    .filter((c): c is ClausulaContrato => c !== null)
    .map((c, i) => ({ titulo: `CLÁUSULA ${ORDINAL(i + 1)} – ${c.titulo}`, paragrafos: c.paragrafos.map((t, j) => `${i + 1}.${j + 1} ${t}`) }))

  return {
    titulo: 'CONTRATO DE PRESTAÇÃO DE SERVIÇOS DE TREINAMENTO PERSONALIZADO',
    abertura: 'Pelo presente instrumento particular, as partes abaixo qualificadas têm entre si justo e acordado o seguinte:',
    partes,
    clausulas,
    fecho: 'E, por estarem de acordo, as partes assinam este contrato em duas vias de igual teor.',
    localData: `${ou(d.foro.split('/')[0])}, ${dataPorExtenso(d.geradoEm)}.`,
    assinaturas: [
      { rotulo: 'CONTRATADO(A)', nome: d.personal.nome },
      d.responsavel ? { rotulo: 'RESPONSÁVEL LEGAL', nome: d.responsavel.nome ?? '' } : { rotulo: 'CONTRATANTE', nome: d.aluno.nome },
      { rotulo: 'TESTEMUNHA 1 (opcional)', nome: '' },
      { rotulo: 'TESTEMUNHA 2 (opcional)', nome: '' },
    ],
  }
}
