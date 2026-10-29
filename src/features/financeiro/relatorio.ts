// Relatório completo do ciclo (recibo + relatório num PDF só), gerado no navegador com jsPDF + autotable.
// Nada vai para servidor. Sem dados de prontidão/bem-estar: só aulas, valores, nota do personal e totais de treino.

import { dataSP, formatarDataCurta, formatarHoraInicioFim, hojeSP, nomeDiaCurto } from '@/lib/datas'
import { formatarBRL } from '@/lib/moeda'
import type { ModeloFatura } from './api'
import { evolucaoDoCiclo } from './evolucaoDoCiclo'
import { avaliacaoDaFatura, type AvaliacaoPersonal } from './avaliacao'
import { ehModalidade, MODALIDADES_CONFIG } from '@/types/modalidades'
import { assiduidade, frequenciaMedia, frequenciaSemanal, metricasDeTreino, MINIMO_NOTAS_PARA_GRAFICO, notaMedia, notasPorTreino, ordenarItens, resumoPorModalidade, resumoRecibo, type ItemRecibo, type PontoNota, type PontoSemana } from './recibo'

const MESES_ABREV = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'] as const

/** "Ter, 15/10 · 12:30–13:30" */
export function rotuloAulaCiclo(startsAt: string, durationMin: number, aDistancia = false): string {
  const dia = dataSP(startsAt)
  return `${nomeDiaCurto(dia)}, ${formatarDataCurta(dia)} · ${aDistancia ? 'treino à distância' : formatarHoraInicioFim(startsAt, durationMin)}`
}

/** "Musculação" a partir da modalidade do treino da sessão; null se a aula não teve sessão (falta, cancelamento…). */
export function rotuloModalidade(modalidade: string | null | undefined): string | null {
  return ehModalidade(modalidade) ? MODALIDADES_CONFIG[modalidade].label : null
}

const semAcento = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '')

/** relatorio-andre-scherer-out-2026.pdf (mês/ano em que o ciclo termina) */
export function nomeArquivoRelatorio(alunoNome: string, periodoFimISO: string, prefixo = 'relatorio'): string {
  const slug = semAcento(alunoNome).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'aluno'
  const [ano, mes] = periodoFimISO.split('-').map(Number)
  return `${prefixo}-${slug}-${MESES_ABREV[mes - 1]}-${ano}.pdf`
}

export type DadosRelatorio = {
  alunoNome: string
  personalNome: string
  periodoInicio: string
  periodoFim: string
  modelo: ModeloFatura
  /** aulas cobradas no ciclo (mesmo formato do recibo) */
  itens: ItemRecibo[]
  ajuste: number
  ajusteDescricao: string | null
  total: number
  /** modelo mensal: quantidade de treinos que o aluno fez à distância no ciclo (não cobrados por treino; só informativo) */
  treinosADistancia?: number
  /** data (aaaa-mm-dd) impressa no rodapé; padrão: hoje (America/Sao_Paulo) */
  geradoEm?: string
  /** sem valores, pagamento, Pix nem total (só o trabalho realizado): o relatório mensal e o de ciclo com a cobrança desligada */
  semFinanceiro?: boolean
  /** relatório mensal de acompanhamento (título, nome do arquivo e textos "do mês") */
  mensal?: boolean
  /** pacote de aulas: quantas aulas foram vendidas ("4 de 10 aulas") */
  aulasContratadas?: number
  /** avaliação escrita pelo personal (conquistas, pontos de atenção, próximos objetivos); sem texto, a seção não aparece */
  avaliacao?: AvaliacaoPersonal | null
  /** como o ciclo fecha: já pago, ou em aberto (com o Pix só se o personal pedir) */
  fechamento?: FechamentoRelatorio
}

export type FechamentoRelatorio =
  | { tipo: 'pago'; pagaEm: string }
  | { tipo: 'aberto'; vencimento: string | null; pix?: PixDoRelatorio | null }

/** Pix no relatório (só quando o personal pede): o código copia-e-cola gera o QR em vetor e também sai escrito, para quem lê no celular. */
export type PixDoRelatorio = { payload: string; recebedor: string | null }

/** Relatório "parcial" enquanto o ciclo não terminou (ou o pacote segue aberto); "encerrado" depois do último dia. */
export function statusDoCiclo(d: Pick<DadosRelatorio, 'periodoFim' | 'geradoEm'>): 'parcial' | 'encerrado' {
  return (d.geradoEm ?? hojeSP()) < d.periodoFim ? 'parcial' : 'encerrado'
}

/** "Smart Fit Laranjeiras, R. X, 100 - Bairro" → "Smart Fit Laranjeiras": o nome do lugar, sem o endereço completo. */
export function localCurto(local: string | null | undefined): string {
  const t = (local ?? '').trim()
  if (!t) return ''
  const partes = t.split(',').map((x) => x.trim()).filter(Boolean)
  // endereço sem nome de lugar ("Rua X, 100"): mantém rua e número
  return partes.length > 1 && /^\d/.test(partes[1]) ? `${partes[0]}, ${partes[1]}` : partes[0]
}

/** Lugares diferentes (nome curto) onde houve aula presente. */
export function locaisDoRelatorio(d: Pick<DadosRelatorio, 'itens'>): string[] {
  const vistos = new Map<string, string>()
  for (const i of d.itens) {
    const nome = localCurto(i.local)
    if (nome && !vistos.has(nome.toLowerCase())) vistos.set(nome.toLowerCase(), nome)
  }
  return [...vistos.values()]
}

/** Dados do relatório de uma fatura já fechada. */
export function dadosRelatorioDeFatura(
  fatura: { periodo_inicio: string; periodo_fim: string; modelo: ModeloFatura; ajuste: number; ajuste_descricao: string | null; total: number },
  itens: ItemRecibo[],
  alunoNome: string,
  personalNome: string,
  extras: Pick<DadosRelatorio, 'aulasContratadas' | 'fechamento' | 'geradoEm' | 'avaliacao'> = {},
): DadosRelatorio {
  return {
    ...extras,
    alunoNome,
    personalNome,
    periodoInicio: fatura.periodo_inicio,
    periodoFim: fatura.periodo_fim,
    modelo: fatura.modelo,
    itens,
    ajuste: fatura.ajuste,
    ajusteDescricao: fatura.ajuste_descricao,
    total: fatura.total,
  }
}

const dm = (iso: string) => formatarDataCurta(iso)
const ROTULO_STATUS: Record<ItemRecibo['status'], string> = { presente: 'Presente', falta: 'Falta', cancelou: 'Cancelou', previsto: 'Previsto' }

/** Colunas da tabela: Local só quando há mais de um lugar (com um só, ele sobe para o cabeçalho); Valor só no modelo por aula. */
export function colunasDaTabela(d: DadosRelatorio): { local: boolean; valor: boolean } {
  return { local: locaisDoRelatorio(d).length > 1, valor: d.modelo === 'por_aula' && !d.semFinanceiro }
}

export function cabecalhoDaTabela(d: DadosRelatorio): string[] {
  const c = colunasDaTabela(d)
  return ['Data', 'Horário', 'Modalidade', ...(c.local ? ['Local'] : []), ...(c.valor ? ['Valor'] : [])]
}

/** Células da tabela: modalidade (com o nome do treino) vazia quando não há; faltas e cancelamentos aparecem no lugar da modalidade. */
export function linhasDaTabela(d: DadosRelatorio): string[][] {
  const c = colunasDaTabela(d)
  return ordenarItens(d.itens).map((i) => {
    const dia = dataSP(i.starts_at)
    const modalidade = rotuloModalidade(i.modalidade)
    return [
      `${nomeDiaCurto(dia)}, ${dm(dia)}`,
      i.a_distancia ? 'À distância' : formatarHoraInicioFim(i.starts_at, i.duration_min).replace('–', '-'),
      i.status !== 'presente' ? ROTULO_STATUS[i.status] : modalidade ? (i.plano_nome ? `${modalidade} · ${i.plano_nome}` : modalidade) : '',
      ...(c.local ? [localCurto(i.local)] : []),
      ...(c.valor ? [i.valor == null ? '-' : formatarBRL(i.valor)] : []),
    ]
  })
}

export const resumoTotalRelatorio = (d: DadosRelatorio): string => {
  const n = d.itens.filter((i) => !i.fora_da_cobranca).length
  return `${n} ${n === 1 ? 'aula' : 'aulas'} · Total: ${formatarBRL(d.total)}`
}

/** Texto do bloco de ajuste: "Ajuste: Desconto — -R$ 20,00" (desconto com "-", acréscimo com "+"). */
export function textoAjuste(d: Pick<DadosRelatorio, 'ajuste' | 'ajusteDescricao'>): string {
  const valor = d.ajuste < 0 ? formatarBRL(d.ajuste) : `+${formatarBRL(d.ajuste)}`
  return `Ajuste${d.ajusteDescricao ? `: ${d.ajusteDescricao}` : ''} — ${valor}`
}

export type Tile = { valor: string; rotulo: string }

/** Linha de resumo: aulas realizadas (pacote: "4 de 10"), dias treinados e, quando dá para confiar, a frequência média semanal. */
export function tilesResumo(d: DadosRelatorio): Tile[] {
  const r = resumoRecibo(d.itens)
  const aDistancia = d.itens.filter((i) => i.status === 'presente' && i.a_distancia).length
  const media = frequenciaMedia(d.itens)
  const semCobranca = d.itens.filter((i) => i.status === 'presente' && i.fora_da_cobranca).length
  const locais = locaisDoRelatorio(d)
  return [
    {
      valor: d.aulasContratadas ? `${r.aulasRealizadas} de ${d.aulasContratadas}` : String(r.aulasRealizadas),
      rotulo: d.aulasContratadas ? 'Aulas do pacote' : aDistancia > 0 ? `Aulas (${aDistancia} à distância)` : 'Aulas realizadas',
    },
    { valor: String(r.diasUnicos), rotulo: 'Dias treinados' },
    ...(semCobranca > 0 ? [{ valor: String(semCobranca), rotulo: semCobranca === 1 ? 'Treino à distância' : 'Treinos à distância' }] : []),
    ...(media != null ? [{ valor: `${String(media).replace('.', ',')}/semana`, rotulo: 'Frequência média' }] : []),
    ...(locais.length > 1 ? [{ valor: String(locais.length), rotulo: 'Locais diferentes' }] : []),
  ]
}

export function formatarDuracao(minutos: number): string {
  const m = Math.round(minutos)
  if (m < 60) return `${m} min`
  const h = Math.floor(m / 60)
  const resto = m % 60
  return resto === 0 ? `${h} h` : `${h} h ${String(resto).padStart(2, '0')} min`
}

/** Totais dos treinos do ciclo; vazio quando não há dado gravado (a seção inteira é omitida). */
export function tilesTreino(d: DadosRelatorio): Tile[] {
  const m = metricasDeTreino(d.itens)
  const distancia: Tile[] = d.treinosADistancia && d.treinosADistancia > 0 ? [{ valor: String(d.treinosADistancia), rotulo: d.treinosADistancia === 1 ? 'Treino à distância' : 'Treinos à distância' }] : []
  if (!m) return distancia
  return [
    ...(m.exercicios > 0 ? [{ valor: String(m.exercicios), rotulo: m.exercicios === 1 ? 'Exercício realizado' : 'Exercícios realizados' }] : []),
    ...(m.series > 0 ? [{ valor: String(m.series), rotulo: m.series === 1 ? 'Série executada' : 'Séries executadas' }] : []),
    ...(m.minutos > 0 ? [{ valor: formatarDuracao(m.minutos), rotulo: 'Tempo de treino' }] : []),
    ...distancia,
  ]
}

/** Cartão de destaque do topo do relatório: um número grande e o que ele significa. */
export type Destaque = { valor: string; rotulo: string }

/**
 * Cartões do topo: aulas realizadas (pacote: "4 de 10"; com falta ou cancelamento COBRADO: "4 de 5") e um por modalidade com o número
 * que ela registrou (10,5 km nadados, 27 séries…), no máximo 4 no total. Modalidade sem número mostra só a quantidade de aulas.
 */
export function cartoesDestaque(d: DadosRelatorio): Destaque[] {
  const r = resumoRecibo(d.itens)
  const a = assiduidade(d.itens)
  const aulas: Destaque = d.aulasContratadas
    ? { valor: `${r.aulasRealizadas} de ${d.aulasContratadas}`, rotulo: 'Aulas do pacote' }
    : a
      ? { valor: `${a.realizadas} de ${a.previstas}`, rotulo: `Aulas realizadas · ${a.faltasCobradas} ${a.faltasCobradas === 1 ? 'falta cobrada' : 'faltas cobradas'}` }
      : { valor: String(r.aulasRealizadas), rotulo: 'Aulas realizadas' }
  const modalidades = resumoPorModalidade(d.itens)
    .slice(0, 3)
    .map<Destaque>((m) => ({ valor: m.destaque ?? String(m.aulas + m.aDistanciaSemCobranca), rotulo: m.destaque ? `${m.rotulo} · ${m.aulas + m.aDistanciaSemCobranca === 1 ? '1 treino' : `${m.aulas + m.aDistanciaSemCobranca} treinos`}` : `${m.rotulo} · treinos` }))
  return [aulas, ...modalidades]
}

/** Linha pequena abaixo dos cartões, para o que é complementar: frequência, dias, à distância, exercícios, séries, nota média. */
export function linhaComplementar(d: DadosRelatorio): string {
  const r = resumoRecibo(d.itens)
  const m = metricasDeTreino(d.itens)
  const media = frequenciaMedia(d.itens)
  const nota = notaMedia(d.itens)
  const distancia = d.itens.filter((i) => i.status === 'presente' && i.fora_da_cobranca).length
  const lugares = locaisDoRelatorio(d).length
  return [
    media != null ? `Frequência média ${String(media).replace('.', ',')}/semana` : null,
    r.diasUnicos > 0 && r.diasUnicos !== r.aulasRealizadas ? `${r.diasUnicos} ${r.diasUnicos === 1 ? 'dia treinado' : 'dias treinados'}` : null,
    distancia > 0 ? `${distancia} ${distancia === 1 ? 'treino à distância' : 'treinos à distância'}` : null,
    lugares > 1 ? `${lugares} locais` : null,
    m && m.exercicios > 0 ? `${m.exercicios} ${m.exercicios === 1 ? 'exercício' : 'exercícios'}` : null,
    m && m.series > 0 ? `${m.series} ${m.series === 1 ? 'série' : 'séries'}` : null,
    m && m.minutos > 0 ? `${formatarDuracao(m.minutos)} de treino` : null,
    nota && nota.treinos < MINIMO_NOTAS_PARA_GRAFICO ? `Nota média do personal ${String(nota.media).replace('.', ',')} (${nota.treinos} ${nota.treinos === 1 ? 'treino' : 'treinos'})` : null,
  ]
    .filter(Boolean)
    .join(' · ')
}

/** Largura e altura de um PNG em data URL (lidas do cabeçalho do arquivo); null se não for PNG. */
export function dimensoesDoPng(dataUrl: string): { w: number; h: number } | null {
  const base64 = dataUrl.split(',')[1]
  if (!base64 || typeof atob !== 'function') return null
  try {
    const bytes = atob(base64.slice(0, 48))
    if (bytes.charCodeAt(1) !== 0x50 || bytes.charCodeAt(2) !== 0x4e || bytes.charCodeAt(3) !== 0x47) return null
    const n = (i: number) => ((bytes.charCodeAt(i) << 24) | (bytes.charCodeAt(i + 1) << 16) | (bytes.charCodeAt(i + 2) << 8) | bytes.charCodeAt(i + 3)) >>> 0
    const w = n(16)
    const h = n(20)
    return w > 0 && h > 0 ? { w, h } : null
  } catch {
    return null
  }
}

// Identidade visual (docs/BRAND.md e index.css): verde da marca e navy.
type RGB = [number, number, number]
const VERDE: RGB = [54, 124, 57]
const VERDE_ESCURO: RGB = [42, 96, 44]
const NAVY: RGB = [15, 37, 55]
const TEXTO: RGB = [51, 65, 85]
const CINZA: RGB = [100, 116, 139]
const LINHA: RGB = [229, 231, 235]
const ZEBRA: RGB = [249, 250, 251]
const AJUSTE_TEXTO: RGB = [113, 63, 18]
const TOTAL_FUNDO: RGB = [220, 252, 231]
const TOTAL_TEXTO: RGB = [20, 83, 45]

const dataGeracao = (iso: string): string => `${formatarDataCurta(iso)}/${iso.slice(0, 4)}`

type Doc = Awaited<ReturnType<typeof criarDoc>>
async function criarDoc(comprimir: boolean) {
  const { jsPDF } = await import('jspdf')
  return new jsPDF({ unit: 'mm', format: 'a4', compress: comprimir })
}

function desenharTiles(doc: Doc, tiles: Tile[], x: number, y: number, largTotal: number): number {
  const gap = 3
  const w = (largTotal - gap * (tiles.length - 1)) / tiles.length
  const h = 21
  tiles.forEach((t, i) => {
    const tx = x + i * (w + gap)
    doc.setFillColor(255, 255, 255)
    doc.setDrawColor(...LINHA)
    doc.setLineWidth(0.3)
    doc.roundedRect(tx, y, w, h, 2.5, 2.5, 'FD')
    doc.setFont('helvetica', 'bold')
    let tamanho = 14
    doc.setFontSize(tamanho)
    while (tamanho > 8 && doc.getTextWidth(t.valor) > w - 5) doc.setFontSize((tamanho -= 0.5))
    doc.setTextColor(...NAVY)
    doc.text(t.valor, tx + w / 2, y + 10, { align: 'center' })
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(8.5)
    doc.setTextColor(...CINZA)
    doc.text(t.rotulo, tx + w / 2, y + 16.5, { align: 'center' })
  })
  return h
}

function eixoY(doc: Doc, x: number, y: number, w: number, h: number, max: number, passo: number) {
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(7.5)
  doc.setTextColor(...CINZA)
  doc.setDrawColor(...LINHA)
  doc.setLineWidth(0.2)
  for (let v = 0; v <= max + 0.001; v += passo) {
    const yy = y + h - (v / max) * h
    doc.line(x, yy, x + w, yy)
    doc.text(String(v), x - 1.5, yy + 1, { align: 'right' })
  }
}

/** Barras por semana (aulas realizadas), desenhadas com retângulos. */
function graficoBarras(doc: Doc, pontos: PontoSemana[], x: number, y: number, w: number, h: number) {
  const max = Math.max(1, ...pontos.map((p) => p.valor))
  const teto = max <= 4 ? max : Math.ceil(max / 2) * 2
  eixoY(doc, x + 6, y, w - 6, h, teto, teto <= 4 ? 1 : 2)
  const area = w - 8
  const slot = area / pontos.length
  const largBarra = Math.min(slot * 0.6, 14)
  pontos.forEach((p, i) => {
    const bx = x + 8 + i * slot + (slot - largBarra) / 2
    const bh = (p.valor / teto) * h
    if (p.valor > 0) {
      doc.setFillColor(...VERDE)
      doc.rect(bx, y + h - bh, largBarra, bh, 'F')
    }
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(7.5)
    doc.setTextColor(...TEXTO)
    if (p.valor > 0) doc.text(String(p.valor), bx + largBarra / 2, y + h - bh - 1, { align: 'center' })
    doc.setTextColor(...CINZA)
    doc.text(p.rotulo, bx + largBarra / 2, y + h + 4, { align: 'center' })
  })
}

/** Linha da nota do personal (0–10) por treino. */
function graficoLinha(doc: Doc, pontos: PontoNota[], x: number, y: number, w: number, h: number) {
  eixoY(doc, x + 6, y, w - 6, h, 10, 2)
  const area = w - 20
  const passo = pontos.length > 1 ? area / (pontos.length - 1) : 0
  const xy = pontos.map((p, i) => [x + 10 + i * passo, y + h - (p.valor / 10) * h] as const)
  doc.setDrawColor(...VERDE)
  doc.setLineWidth(0.7)
  for (let i = 1; i < xy.length; i++) doc.line(xy[i - 1][0], xy[i - 1][1], xy[i][0], xy[i][1])
  const cadaQuantos = Math.ceil(pontos.length / 10)
  xy.forEach(([px, py], i) => {
    doc.setFillColor(...VERDE) // setTextColor (rótulos) mexe na mesma cor de preenchimento do PDF
    doc.circle(px, py, 1.1, 'F')
    if (i % cadaQuantos === 0 || i === xy.length - 1) {
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(7.5)
      doc.setTextColor(...CINZA)
      doc.text(pontos[i].rotulo, px, y + h + 4, { align: 'center' })
    }
  })
}

/**
 * Relatório completo do ciclo (recibo + relatório): cabeçalho, resumo, treinos, tabela de aulas, gráficos e total.
 * Retorna o documento; quem chama decide salvar. jsPDF é importado sob demanda para não pesar o app.
 * `logoDataUrl` (PNG em data URL) é opcional: sem ele o cabeçalho usa só o nome estilizado.
 */
/** `comprimir: false` deixa o texto legível no arquivo (os testes leem o conteúdo); no uso normal o PDF sai comprimido (arquivo menor para enviar). */
export async function gerarRelatorioCompleto(d: DadosRelatorio, logoDataUrl?: string | null, opcoes: { comprimir?: boolean } = {}) {
  const [doc, { default: autoTable }, { default: QRCode }] = await Promise.all([criarDoc(opcoes.comprimir ?? true), import('jspdf-autotable'), import('qrcode')])
  const larg = doc.internal.pageSize.getWidth()
  const alt = doc.internal.pageSize.getHeight()
  const margem = 16
  const largBloco = larg - margem * 2
  const geradoEm = dataGeracao(d.geradoEm ?? hojeSP())

  const rodape = () => {
    doc.setDrawColor(...LINHA)
    doc.setLineWidth(0.3)
    doc.line(margem, alt - 20, larg - margem, alt - 20)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(...CINZA)
    doc.setFontSize(9)
    doc.text(`Gerado via Treino · Personal Perto · ${geradoEm}`, larg / 2, alt - 14, { align: 'center' })
    doc.setFontSize(8)
    doc.text('Este documento é um resumo informativo e não tem valor fiscal.', larg / 2, alt - 9.5, { align: 'center' })
  }

  // --- Cabeçalho compacto: logo da marca à esquerda, identificação à direita ---
  const alturaCab = 36
  doc.setFillColor(...VERDE_ESCURO)
  doc.rect(0, 0, larg, alturaCab, 'F')
  let xTexto = margem
  if (logoDataUrl) {
    try {
      const dim = dimensoesDoPng(logoDataUrl) ?? { w: 1485, h: 565 }
      const hLogo = 17
      const wLogo = Math.min(hLogo * (dim.w / dim.h), 52)
      doc.setFillColor(255, 255, 255)
      doc.roundedRect(margem, 8, wLogo + 6, 20, 3, 3, 'F')
      doc.addImage(logoDataUrl, 'PNG', margem + 3, 9.5, wLogo, wLogo / (dim.w / dim.h))
      xTexto = margem + wLogo + 12
    } catch {
      xTexto = margem
    }
  }
  const parcial = statusDoCiclo(d) === 'parcial'
  const quando = d.mensal ? 'do mês' : 'do ciclo'
  const situacao = parcial ? `Parcial ${quando}, atualizado em ${geradoEm}` : d.mensal ? 'Mês encerrado' : 'Ciclo encerrado'
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8)
  doc.setTextColor(200, 230, 201)
  doc.text(d.mensal ? 'RELATÓRIO MENSAL DE ACOMPANHAMENTO' : 'RELATÓRIO DE ACOMPANHAMENTO', xTexto, 12)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(16)
  doc.setTextColor(255, 255, 255)
  doc.text(d.alunoNome, xTexto, 19.5, { maxWidth: larg - margem - xTexto })
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)
  doc.text(`Personal: ${d.personalNome}`, xTexto, 25.5, { maxWidth: larg - margem - xTexto })
  const lugares = locaisDoRelatorio(d)
  doc.text(`${dm(d.periodoInicio)} a ${dm(d.periodoFim)} · ${situacao}`, xTexto, 30.5, { maxWidth: larg - margem - xTexto })
  if (lugares.length === 1) doc.text(`Local: ${lugares[0]}`, xTexto, 34.5, { maxWidth: larg - margem - xTexto })

  let y = alturaCab + 8
  const garantirEspaco = (altura: number) => {
    if (y + altura > alt - 26) {
      doc.addPage()
      rodape()
      y = 20
    }
  }
  const titulo = (texto: string) => {
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(11)
    doc.setTextColor(...NAVY)
    doc.text(texto, margem, y)
    y += 5
  }

  // --- Destaques: aulas e o número de cada modalidade ---
  y += desenharTiles(doc, cartoesDestaque(d).map((c) => ({ valor: c.valor, rotulo: c.rotulo })), margem, y, largBloco) + 3
  const complementar = linhaComplementar(d)
  if (complementar) {
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(9)
    doc.setTextColor(...CINZA)
    const linhasComp = doc.splitTextToSize(complementar, largBloco) as string[]
    doc.text(linhasComp, margem, y + 3)
    y += linhasComp.length * 4.2 + 3
  }
  y += 4

  // --- Avaliação do personal em destaque (só os blocos que ele escreveu) ---
  if (d.avaliacao) {
    const blocos = ([['Conquistas do ciclo', d.avaliacao.conquistas], ['Pontos de atenção', d.avaliacao.atencao], ['Próximos objetivos', d.avaliacao.proximos]] as const).filter(([, t]) => !!t) as [string, string][]
    doc.setFontSize(10.5)
    const medidos = blocos.map(([rotulo, texto]) => ({ rotulo, linhas: doc.splitTextToSize(texto, largBloco - 12) as string[] }))
    const altura = 10 + medidos.reduce((a, b) => a + 6 + b.linhas.length * 4.8 + 2, 0)
    garantirEspaco(altura + 4)
    doc.setFillColor(...TOTAL_FUNDO)
    doc.roundedRect(margem, y, largBloco, altura, 2.5, 2.5, 'F')
    doc.setFillColor(...VERDE)
    doc.rect(margem, y + 2, 1.6, altura - 4, 'F')
    let yy = y + 7.5
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(10)
    doc.setTextColor(...TOTAL_TEXTO)
    doc.text(d.mensal ? 'Avaliação do personal no mês' : 'Avaliação do personal', margem + 6, yy)
    yy += 5
    for (const b of medidos) {
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(9)
      doc.setTextColor(...VERDE_ESCURO)
      doc.text(b.rotulo.toUpperCase(), margem + 6, yy)
      yy += 4.6
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(10.5)
      doc.setTextColor(...TEXTO)
      doc.text(b.linhas, margem + 6, yy)
      yy += b.linhas.length * 4.8 + 3
    }
    y += altura + 6
  }

  // --- Evolução no ciclo (só o que melhorou e tem dois registros comparáveis) ---
  const evolucao = evolucaoDoCiclo(d.itens)
  if (evolucao.length > 0) {
    garantirEspaco(14)
    titulo(d.mensal ? 'Evolução no mês' : 'Evolução no ciclo')
    doc.setFontSize(10)
    for (const e of evolucao) {
      const linhasTexto = doc.splitTextToSize(`${e.assunto} (${e.modalidade}): ${e.de} → ${e.para}  ${e.variacao}`, largBloco - 6) as string[]
      garantirEspaco(linhasTexto.length * 4.6 + 3)
      doc.setFont('helvetica', 'normal')
      doc.setTextColor(...TEXTO)
      doc.text(linhasTexto, margem + 2, y)
      y += linhasTexto.length * 4.6 + 1.5
    }
    y += 4
  }

  // --- Resumo financeiro: valor, situação e Pix juntos, na primeira página (antes da tabela) ---
  if (!d.semFinanceiro) {
    const f = d.fechamento
    const pix = f?.tipo === 'aberto' ? f.pix : null
    const ajusteTexto = d.ajuste !== 0 ? (doc.splitTextToSize(textoAjuste(d), pix ? largBloco - 56 : largBloco - 10) as string[]) : []
    const alturaCard = Math.max(pix ? 40 : 26, 22 + ajusteTexto.length * 4.6)
    const copiaCola = pix ? (doc.splitTextToSize(pix.payload, largBloco - 8) as string[]) : []
    const alturaCopia = pix ? 12 + copiaCola.length * 3.2 : 0
    garantirEspaco(alturaCard + alturaCopia + 8)
    doc.setFillColor(...ZEBRA)
    doc.setDrawColor(...LINHA)
    doc.setLineWidth(0.3)
    doc.roundedRect(margem, y, largBloco, alturaCard, 2.5, 2.5, 'FD')
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(10)
    doc.setTextColor(...NAVY)
    doc.text('Resumo financeiro', margem + 5, y + 7)
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(8.5)
    doc.setTextColor(...CINZA)
    doc.text(resumoTotalRelatorio(d).replace(/ · Total:.*/, '') + (d.modelo === 'pacote' ? ' · pacote de aulas' : ''), margem + 5, y + 12)
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(20)
    doc.setTextColor(...TOTAL_TEXTO)
    doc.text(formatarBRL(d.total), margem + 5, y + 22)
    let yy = y + 22
    if (ajusteTexto.length > 0) {
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(8.5)
      doc.setTextColor(...AJUSTE_TEXTO)
      doc.text(ajusteTexto, margem + 5, yy + 5)
      yy += 4.6 * ajusteTexto.length
    }
    if (f) {
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(10)
      doc.setTextColor(...(f.tipo === 'pago' ? TOTAL_TEXTO : NAVY))
      doc.text(f.tipo === 'pago' ? `Pago em ${dataGeracao(f.pagaEm)}` : f.vencimento ? `Em aberto · vencimento ${dataGeracao(f.vencimento)}` : 'Em aberto', margem + 5, yy + 6.5)
    }
    if (pix) {
      const lado = 32
      const qx = larg - margem - lado - 4
      desenharQr(doc, QRCode.create(pix.payload, { errorCorrectionLevel: 'M' }), qx, y + 4, lado)
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(8)
      doc.setTextColor(...CINZA)
      doc.text('Pague via Pix', qx + lado / 2, y + 4 + lado + 3.2, { align: 'center' })
    }
    y += alturaCard + 3
    if (pix) {
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(8)
      doc.setTextColor(...CINZA)
      const intro = `${pix.recebedor ? `Recebedor: ${pix.recebedor}. ` : ''}Confira o valor e o recebedor no app do seu banco antes de confirmar. Pix copia e cola:`
      const linhasIntro = doc.splitTextToSize(intro, largBloco) as string[]
      doc.text(linhasIntro, margem, y + 3)
      y += linhasIntro.length * 3.4 + 2
      doc.setFont('courier', 'normal')
      doc.setFontSize(7)
      doc.setTextColor(...TEXTO)
      doc.text(copiaCola, margem, y + 3)
      y += copiaCola.length * 3.2 + 3
    }
    y += 5
  }

  // --- Tabela de aulas (compacta; continua na próxima página se for longa) ---
  garantirEspaco(24)
  titulo(d.mensal ? 'Aulas do mês' : d.modelo === 'pacote' ? 'Aulas do pacote' : 'Aulas do ciclo')
  autoTable(doc, {
    startY: y,
    head: [cabecalhoDaTabela(d).map((c) => (c === 'Valor' ? { content: c, styles: { halign: 'right' as const } } : c))],
    body: linhasDaTabela(d),
    margin: { left: margem, right: margem, bottom: 26 },
    theme: 'plain',
    styles: { fontSize: 9.5, cellPadding: { top: 2.2, bottom: 2.2, left: 3, right: 3 }, textColor: TEXTO, lineColor: LINHA, lineWidth: { bottom: 0.2 } },
    headStyles: { fillColor: VERDE_ESCURO, textColor: 255, fontStyle: 'bold', lineWidth: 0 },
    alternateRowStyles: { fillColor: ZEBRA },
    columnStyles: colunasDaTabela(d).valor ? { [cabecalhoDaTabela(d).length - 1]: { halign: 'right' } } : {},
    didDrawPage: rodape,
  })
  y = ((doc as unknown as { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ?? y) + 8

  // --- Frequência semanal: só com 3 semanas ou mais (antes disso a tabela já conta a história) ---
  const frequencia = frequenciaSemanal(d.itens)
  if (frequencia.length >= 3) {
    garantirEspaco(58)
    titulo('Frequência semanal (aulas por semana)')
    y += 3
    graficoBarras(doc, frequencia, margem, y, largBloco, 34)
    y += 34 + 12
  }
  // --- Nota do personal por treino: gráfico só com 5 treinos avaliados ou mais; com menos, a média fica na linha de destaques ---
  const notas = notasPorTreino(d.itens)
  if (notas.length >= MINIMO_NOTAS_PARA_GRAFICO) {
    garantirEspaco(58)
    titulo('Nota do personal por treino (0 a 10)')
    y += 3
    graficoLinha(doc, notas, margem, y, largBloco, 34)
    y += 34 + 12
  }

  // --- Sem parte financeira: só o fecho com a contagem de aulas ---
  if (d.semFinanceiro) {
    garantirEspaco(18)
    doc.setFillColor(...TOTAL_FUNDO)
    doc.roundedRect(margem, y, largBloco, 14, 2, 2, 'F')
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(14)
    doc.setTextColor(...TOTAL_TEXTO)
    const n = d.itens.filter((i) => i.status === 'presente' && !i.fora_da_cobranca).length
    doc.text(`${n} ${n === 1 ? 'aula realizada' : 'aulas realizadas'} ${d.mensal ? 'no mês' : 'no ciclo'}`, margem + 4, y + 9.3)
  }
  return doc
}

type MatrizQr = { modules: { size: number; get: (linha: number, coluna: number) => number } }

/** QR Code desenhado em vetor (retângulos), com a borda branca exigida pela leitura: nítido em qualquer zoom e na impressão. */
function desenharQr(doc: Doc, qr: MatrizQr, x: number, y: number, lado: number) {
  const n = qr.modules.size
  const borda = 4
  const celula = lado / (n + borda * 2)
  doc.setFillColor(255, 255, 255)
  doc.rect(x, y, lado, lado, 'F')
  doc.setFillColor(0, 0, 0)
  for (let l = 0; l < n; l++) {
    let c = 0
    while (c < n) {
      if (!qr.modules.get(l, c)) {
        c++
        continue
      }
      let fim = c
      while (fim < n && qr.modules.get(l, fim)) fim++
      doc.rect(x + (borda + c) * celula, y + (borda + l) * celula, (fim - c) * celula + 0.02, celula + 0.02, 'F')
      c = fim
    }
  }
}

/** Carrega a logo completa da marca (símbolo + "Personal Perto") como data URL PNG; null se não carregar (o PDF sai só com o nome). */
async function carregarLogo(): Promise<string | null> {
  try {
    const { default: url } = await import('@/assets/brand/logo-personal-perto.png')
    const blob = await (await fetch(url)).blob()
    return await new Promise<string>((resolve, reject) => {
      const leitor = new FileReader()
      leitor.onload = () => resolve(String(leitor.result))
      leitor.onerror = () => reject(leitor.error)
      leitor.readAsDataURL(blob)
    })
  } catch {
    return null
  }
}

/** Gera e baixa o PDF com o nome relatorio-[aluno]-[mês-ano].pdf. */
export async function baixarRelatorioCompleto(d: DadosRelatorio): Promise<void> {
  const doc = await gerarRelatorioCompleto(d, await carregarLogo())
  doc.save(nomeArquivoRelatorio(d.alunoNome, d.periodoFim, d.mensal ? 'relatorio-mensal' : 'relatorio'))
}

/** Como o relatório fecha a fatura: pago, ou em aberto (Pix só se o personal incluir). Cancelada não tem fechamento. */
export function fechamentoDaFatura(
  f: { status: string; paga_em: string | null; vencimento: string | null },
  pix?: PixDoRelatorio | null,
): FechamentoRelatorio | undefined {
  if (f.status === 'paga' && f.paga_em) return { tipo: 'pago', pagaEm: f.paga_em }
  if (f.status === 'aberta' || f.status === 'enviada') return { tipo: 'aberto', vencimento: f.vencimento, pix: pix ?? null }
  return undefined
}

/** Extras do relatório de uma fatura: aulas vendidas (pacote) e o fechamento. */
export function extrasDaFatura(
  f: { modelo: ModeloFatura; qtd_aulas: number; status: string; paga_em: string | null; vencimento: string | null; avaliacao_conquistas?: string | null; avaliacao_atencao?: string | null; avaliacao_proximos?: string | null },
  pix?: PixDoRelatorio | null,
): Pick<DadosRelatorio, 'aulasContratadas' | 'fechamento' | 'avaliacao'> {
  return { aulasContratadas: f.modelo === 'pacote' ? f.qtd_aulas : undefined, fechamento: fechamentoDaFatura(f, pix), avaliacao: avaliacaoDaFatura(f) }
}
