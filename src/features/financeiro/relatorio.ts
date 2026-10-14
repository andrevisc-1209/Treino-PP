// Relatório mensal do ciclo (PDF gerado no navegador com jsPDF + autotable; nada vai para servidor).

import { dataSP, formatarDataCurta, formatarHoraInicioFim, hojeSP, nomeDiaCurto } from '@/lib/datas'
import { formatarBRL } from '@/lib/moeda'
import { ehModalidade, MODALIDADES_CONFIG } from '@/types/modalidades'

const MESES_ABREV = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'] as const

/** "Ter, 15/10 · 12:30–13:30" */
export function rotuloAulaCiclo(startsAt: string, durationMin: number): string {
  const dia = dataSP(startsAt)
  return `${nomeDiaCurto(dia)}, ${formatarDataCurta(dia)} · ${formatarHoraInicioFim(startsAt, durationMin)}`
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

export type LinhaRelatorio = { startsAt: string; durationMin: number; modalidade: string | null; local: string | null; valor: number | null }

export type DadosRelatorio = {
  alunoNome: string
  personalNome: string
  periodoInicio: string
  periodoFim: string
  modelo: 'por_aula' | 'mensal'
  linhas: LinhaRelatorio[]
  ajuste: number
  ajusteDescricao: string | null
  total: number
  /** data (aaaa-mm-dd) impressa no rodapé; padrão: hoje (America/Sao_Paulo) */
  geradoEm?: string
}

const dm = (iso: string) => formatarDataCurta(iso)

/** Células da tabela (jsPDF usa só Latin-1: traço comum no horário, sem "·" decorativo nas células). */
export function linhasDaTabela(d: DadosRelatorio): string[][] {
  return [...d.linhas]
    .sort((a, b) => a.startsAt.localeCompare(b.startsAt))
    .map((l) => {
      const dia = dataSP(l.startsAt)
      return [
        `${nomeDiaCurto(dia)}, ${dm(dia)}`,
        formatarHoraInicioFim(l.startsAt, l.durationMin).replace('–', '-'),
        rotuloModalidade(l.modalidade) ?? '-',
        l.local?.trim() || '-',
        d.modelo === 'mensal' || l.valor == null ? '-' : formatarBRL(l.valor),
      ]
    })
}

export const resumoTotalRelatorio = (d: DadosRelatorio): string => `${d.linhas.length} ${d.linhas.length === 1 ? 'aula' : 'aulas'} · Total: ${formatarBRL(d.total)}`

/** Texto do bloco de ajuste: "Ajuste: Desconto — -R$ 20,00" (desconto com "-", acréscimo com "+"). */
export function textoAjuste(d: Pick<DadosRelatorio, 'ajuste' | 'ajusteDescricao'>): string {
  const valor = d.ajuste < 0 ? formatarBRL(d.ajuste) : `+${formatarBRL(d.ajuste)}`
  return `Ajuste${d.ajusteDescricao ? `: ${d.ajusteDescricao}` : ''} — ${valor}`
}

// Identidade visual (docs/BRAND.md e index.css): verde da marca #367c39 e navy #0f2537.
type RGB = [number, number, number]
const VERDE: RGB = [54, 124, 57]
const NAVY: RGB = [15, 37, 55]
const TEXTO: RGB = [51, 65, 85]
const CINZA_CLARO: RGB = [148, 163, 184]
const LINHA: RGB = [229, 231, 235]
const ZEBRA: RGB = [249, 250, 251]
const AJUSTE_FUNDO: RGB = [254, 252, 232]
const AJUSTE_BORDA: RGB = [253, 230, 138]
const AJUSTE_TEXTO: RGB = [113, 63, 18]
const TOTAL_FUNDO: RGB = [220, 252, 231]
const TOTAL_TEXTO: RGB = [20, 83, 45]

const dataGeracao = (iso: string): string => formatarDataCurta(iso) + '/' + iso.slice(0, 4)

/**
 * Monta o PDF (retorna o documento; quem chama decide salvar). Importa jsPDF sob demanda para não pesar o app.
 * `logoDataUrl` (PNG em data URL) é opcional: sem ele o cabeçalho usa só o nome estilizado.
 */
export async function construirRelatorioPdf(d: DadosRelatorio, logoDataUrl?: string | null) {
  const [{ jsPDF }, { default: autoTable }] = await Promise.all([import('jspdf'), import('jspdf-autotable')])
  const doc = new jsPDF({ unit: 'mm', format: 'a4' })
  const larg = doc.internal.pageSize.getWidth()
  const alt = doc.internal.pageSize.getHeight()
  const margem = 16
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

  // --- Cabeçalho colorido ---
  doc.setFillColor(...VERDE)
  doc.rect(0, 0, larg, 34, 'F')
  let xTitulo = margem
  if (logoDataUrl) {
    try {
      doc.setFillColor(255, 255, 255)
      doc.roundedRect(margem, 7, 22, 20, 3, 3, 'F')
      doc.addImage(logoDataUrl, 'PNG', margem + 2.5, 8.5, 17, 15.6)
      xTitulo = margem + 28
    } catch {
      xTitulo = margem
    }
  }
  doc.setTextColor(255, 255, 255)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(17)
  doc.text('Treino · Personal Perto', xTitulo, 20)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(11)
  doc.text('Relatório do Ciclo', larg - margem, 20, { align: 'right' })

  // --- Identificação ---
  doc.setTextColor(...NAVY)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(15)
  doc.text(d.alunoNome, margem, 46)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(10.5)
  doc.setTextColor(...TEXTO)
  doc.text(`Personal: ${d.personalNome}`, margem, 53)
  doc.text(`Período: ${dm(d.periodoInicio)} a ${dm(d.periodoFim)}`, margem, 59)

  // --- Tabela ---
  autoTable(doc, {
    startY: 66,
    head: [['Data', 'Horário', 'Modalidade', 'Local', { content: 'Valor', styles: { halign: 'right' } }]],
    body: linhasDaTabela(d),
    margin: { left: margem, right: margem, bottom: 26 },
    theme: 'plain',
    styles: { fontSize: 10, cellPadding: { top: 3, bottom: 3, left: 3, right: 3 }, textColor: TEXTO, lineColor: LINHA, lineWidth: { bottom: 0.2 } },
    headStyles: { fillColor: VERDE, textColor: 255, fontStyle: 'bold', lineWidth: 0 },
    alternateRowStyles: { fillColor: ZEBRA },
    columnStyles: { 4: { halign: 'right' } },
    didDrawPage: rodape,
  })

  let y = ((doc as unknown as { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ?? 70) + 8
  const garantirEspaco = (altura: number) => {
    if (y + altura > alt - 26) {
      doc.addPage()
      rodape()
      y = 20
    }
  }
  const largBloco = larg - margem * 2

  if (d.modelo === 'mensal') {
    garantirEspaco(8)
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(10.5)
    doc.setTextColor(...TEXTO)
    doc.text('Mensalidade: valor fixo do ciclo', margem, y)
    y += 8
  }

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
export async function baixarRelatorioPdf(d: DadosRelatorio): Promise<void> {
  const doc = await construirRelatorioPdf(d, await carregarLogo())
  doc.save(nomeArquivoRelatorio(d.alunoNome, d.periodoFim))
}
