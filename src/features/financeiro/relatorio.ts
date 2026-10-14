// Relatório completo do ciclo (recibo + relatório num PDF só), gerado no navegador com jsPDF + autotable.
// Nada vai para servidor. Sem dados de prontidão/bem-estar: só aulas, valores, nota do personal e totais de treino.

import { dataSP, formatarDataCurta, formatarHoraInicioFim, hojeSP, nomeDiaCurto } from '@/lib/datas'
import { formatarBRL } from '@/lib/moeda'
import { ehModalidade, MODALIDADES_CONFIG } from '@/types/modalidades'
import { frequenciaSemanal, metricasDeTreino, notasPorTreino, ordenarItens, resumoRecibo, type ItemRecibo, type PontoNota, type PontoSemana } from './recibo'

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
export function nomeArquivoRelatorio(alunoNome: string, periodoFimISO: string): string {
  const slug = semAcento(alunoNome).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'aluno'
  const [ano, mes] = periodoFimISO.split('-').map(Number)
  return `relatorio-${slug}-${MESES_ABREV[mes - 1]}-${ano}.pdf`
}

export type DadosRelatorio = {
  alunoNome: string
  personalNome: string
  periodoInicio: string
  periodoFim: string
  modelo: 'por_aula' | 'mensal'
  /** aulas cobradas no ciclo (mesmo formato do recibo) */
  itens: ItemRecibo[]
  ajuste: number
  ajusteDescricao: string | null
  total: number
  /** modelo mensal: quantidade de treinos que o aluno fez à distância no ciclo (não cobrados por treino; só informativo) */
  treinosADistancia?: number
  /** data (aaaa-mm-dd) impressa no rodapé; padrão: hoje (America/Sao_Paulo) */
  geradoEm?: string
}

/** Dados do relatório de uma fatura já fechada. */
export function dadosRelatorioDeFatura(
  fatura: { periodo_inicio: string; periodo_fim: string; modelo: 'por_aula' | 'mensal'; ajuste: number; ajuste_descricao: string | null; total: number },
  itens: ItemRecibo[],
  alunoNome: string,
  personalNome: string,
): DadosRelatorio {
  return {
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

/** Células da tabela: local/modalidade ficam vazios quando não há (nada de "-"); faltas e cancelamentos aparecem no lugar da modalidade. */
export function linhasDaTabela(d: DadosRelatorio): string[][] {
  return ordenarItens(d.itens).map((i) => {
    const dia = dataSP(i.starts_at)
    return [
      `${nomeDiaCurto(dia)}, ${dm(dia)}`,
      i.a_distancia ? 'À distância' : formatarHoraInicioFim(i.starts_at, i.duration_min).replace('–', '-'),
      i.status !== 'presente' ? ROTULO_STATUS[i.status] : (rotuloModalidade(i.modalidade) ?? ''),
      i.local?.trim() ?? '',
      d.modelo === 'mensal' || i.valor == null ? '-' : formatarBRL(i.valor),
    ]
  })
}

export const resumoTotalRelatorio = (d: DadosRelatorio): string => `${d.itens.length} ${d.itens.length === 1 ? 'aula' : 'aulas'} · Total: ${formatarBRL(d.total)}`

/** Texto do bloco de ajuste: "Ajuste: Desconto — -R$ 20,00" (desconto com "-", acréscimo com "+"). */
export function textoAjuste(d: Pick<DadosRelatorio, 'ajuste' | 'ajusteDescricao'>): string {
  const valor = d.ajuste < 0 ? formatarBRL(d.ajuste) : `+${formatarBRL(d.ajuste)}`
  return `Ajuste${d.ajusteDescricao ? `: ${d.ajusteDescricao}` : ''} — ${valor}`
}

export type Tile = { valor: string; rotulo: string }

/** Linha de resumo: aulas realizadas, valor total, dias treinados e local(is). */
export function tilesResumo(d: DadosRelatorio): Tile[] {
  const r = resumoRecibo(d.itens)
  const locais: Tile = r.locais.length === 1 ? { valor: r.locais[0], rotulo: 'Local' } : r.locais.length === 0 ? { valor: '—', rotulo: 'Local' } : { valor: String(r.locais.length), rotulo: 'Locais diferentes' }
  const aDistancia = d.itens.filter((i) => i.status === 'presente' && i.a_distancia).length
  return [
    { valor: String(r.aulasRealizadas), rotulo: aDistancia > 0 ? `Aulas (${aDistancia} à distância)` : 'Aulas realizadas' },
    { valor: formatarBRL(d.total), rotulo: 'Valor total do ciclo' },
    { valor: String(r.diasUnicos), rotulo: 'Dias treinados' },
    locais,
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

// Identidade visual (docs/BRAND.md e index.css): verde da marca e navy.
type RGB = [number, number, number]
const VERDE: RGB = [54, 124, 57]
const VERDE_ESCURO: RGB = [42, 96, 44]
const NAVY: RGB = [15, 37, 55]
const TEXTO: RGB = [51, 65, 85]
const CINZA: RGB = [100, 116, 139]
const CINZA_CLARO: RGB = [148, 163, 184]
const LINHA: RGB = [229, 231, 235]
const ZEBRA: RGB = [249, 250, 251]
const AJUSTE_FUNDO: RGB = [254, 252, 232]
const AJUSTE_BORDA: RGB = [253, 230, 138]
const AJUSTE_TEXTO: RGB = [113, 63, 18]
const TOTAL_FUNDO: RGB = [220, 252, 231]
const TOTAL_TEXTO: RGB = [20, 83, 45]

const dataGeracao = (iso: string): string => `${formatarDataCurta(iso)}/${iso.slice(0, 4)}`

type Doc = Awaited<ReturnType<typeof criarDoc>>
async function criarDoc() {
  const { jsPDF } = await import('jspdf')
  return new jsPDF({ unit: 'mm', format: 'a4' })
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
export async function gerarRelatorioCompleto(d: DadosRelatorio, logoDataUrl?: string | null) {
  const [doc, { default: autoTable }] = await Promise.all([criarDoc(), import('jspdf-autotable')])
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
    doc.setTextColor(...CINZA_CLARO)
    doc.setFontSize(9)
    doc.text(`Gerado via Treino · Personal Perto · ${geradoEm}`, larg / 2, alt - 14, { align: 'center' })
    doc.setFontSize(8)
    doc.text('Este documento é um resumo informativo e não tem valor fiscal.', larg / 2, alt - 9.5, { align: 'center' })
  }

  // --- Cabeçalho ---
  doc.setFillColor(...VERDE_ESCURO)
  doc.rect(0, 0, larg, 42, 'F')
  let xTexto = margem
  if (logoDataUrl) {
    try {
      doc.setFillColor(255, 255, 255)
      doc.roundedRect(margem, 9, 24, 24, 3, 3, 'F')
      doc.addImage(logoDataUrl, 'PNG', margem + 3, 11.6, 18, 16.5)
      xTexto = margem + 30
    } catch {
      xTexto = margem
    }
  }
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8.5)
  doc.setTextColor(200, 230, 201)
  doc.text('RECIBO · TREINO · PERSONAL PERTO', xTexto, 15)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(18)
  doc.setTextColor(255, 255, 255)
  doc.text(d.alunoNome, xTexto, 24, { maxWidth: larg - margem - xTexto })
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(10)
  doc.text(`Personal: ${d.personalNome}`, xTexto, 31)
  doc.text(`Período do ciclo: ${dm(d.periodoInicio)} a ${dm(d.periodoFim)}`, xTexto, 37)

  let y = 52
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

  // --- Resumo ---
  y += desenharTiles(doc, tilesResumo(d), margem, y, largBloco) + 6

  // --- Resumo de treinos (só se houver dado gravado) ---
  const treino = tilesTreino(d)
  if (treino.length > 0) {
    titulo('Resumo de treinos')
    y += desenharTiles(doc, treino, margem, y, largBloco) + 8
  }

  // --- Tabela de aulas ---
  titulo('Aulas do ciclo')
  autoTable(doc, {
    startY: y,
    head: [['Data', 'Horário', 'Modalidade', 'Local', { content: 'Valor', styles: { halign: 'right' } }]],
    body: linhasDaTabela(d),
    margin: { left: margem, right: margem, bottom: 26 },
    theme: 'plain',
    styles: { fontSize: 10, cellPadding: { top: 3, bottom: 3, left: 3, right: 3 }, textColor: TEXTO, lineColor: LINHA, lineWidth: { bottom: 0.2 } },
    headStyles: { fillColor: VERDE_ESCURO, textColor: 255, fontStyle: 'bold', lineWidth: 0 },
    alternateRowStyles: { fillColor: ZEBRA },
    columnStyles: { 4: { halign: 'right' } },
    didDrawPage: rodape,
  })
  y = ((doc as unknown as { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ?? y) + 8

  if (d.modelo === 'mensal') {
    garantirEspaco(8)
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(10.5)
    doc.setTextColor(...TEXTO)
    doc.text('Mensalidade: valor fixo do ciclo', margem, y)
    y += 8
  }

  // --- Gráficos (mesmos dados do recibo: frequência semanal e nota do personal) ---
  const frequencia = frequenciaSemanal(d.itens)
  if (frequencia.length > 0) {
    garantirEspaco(58)
    titulo('Frequência semanal (aulas por semana)')
    y += 3
    graficoBarras(doc, frequencia, margem, y, largBloco, 34)
    y += 34 + 12
  }
  const notas = notasPorTreino(d.itens)
  if (notas.length >= 2) {
    garantirEspaco(58)
    titulo('Avaliação do personal por treino (0–10)')
    y += 3
    graficoLinha(doc, notas, margem, y, largBloco, 34)
    y += 34 + 12
  }

  // --- Ajuste e total ---
  if (d.ajuste !== 0) {
    const linhas = doc.splitTextToSize(textoAjuste(d), largBloco - 8) as string[]
    const altura = 6 + linhas.length * 5
    garantirEspaco(altura + 6)
    doc.setFillColor(...AJUSTE_FUNDO)
    doc.setDrawColor(...AJUSTE_BORDA)
    doc.setLineWidth(0.3)
    doc.roundedRect(margem, y, largBloco, altura, 2, 2, 'FD')
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(10.5)
    doc.setTextColor(...AJUSTE_TEXTO)
    doc.text(linhas, margem + 4, y + 6.5)
    y += altura + 6
  }
  garantirEspaco(18)
  doc.setFillColor(...TOTAL_FUNDO)
  doc.roundedRect(margem, y, largBloco, 14, 2, 2, 'F')
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(14)
  doc.setTextColor(...TOTAL_TEXTO)
  doc.text(resumoTotalRelatorio(d), margem + 4, y + 9.3)
  return doc
}

/** Carrega a logo (icon-mark) como data URL PNG; null se não carregar (o PDF sai só com o nome). */
async function carregarLogo(): Promise<string | null> {
  try {
    const { default: url } = await import('@/assets/brand/icon-mark.png')
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
  doc.save(nomeArquivoRelatorio(d.alunoNome, d.periodoFim))
}
