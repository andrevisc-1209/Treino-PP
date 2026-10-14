// Relatório mensal do ciclo (PDF gerado no navegador com jsPDF + autotable; nada vai para servidor).

import { dataSP, formatarDataCurta, formatarHoraInicioFim, nomeDiaCurto } from '@/lib/datas'
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

export const resumoTotalRelatorio = (d: DadosRelatorio): string => `${d.linhas.length} ${d.linhas.length === 1 ? 'aula' : 'aulas'} - Total: ${formatarBRL(d.total)}`

/** Monta o PDF (retorna o documento; quem chama decide salvar). Importa jsPDF sob demanda para não pesar o app. */
export async function construirRelatorioPdf(d: DadosRelatorio) {
  const [{ jsPDF }, { default: autoTable }] = await Promise.all([import('jspdf'), import('jspdf-autotable')])
  const doc = new jsPDF({ unit: 'mm', format: 'a4' })
  const margem = 16
  const largura = doc.internal.pageSize.getWidth()

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(18)
  doc.setTextColor(15, 37, 55)
  doc.text('Relatório do ciclo', margem, 20)

  doc.setFontSize(11)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(51, 65, 85)
  doc.text(`Aluno: ${d.alunoNome}`, margem, 29)
  doc.text(`Personal: ${d.personalNome}`, margem, 35)
  doc.text(`Período: ${dm(d.periodoInicio)} a ${dm(d.periodoFim)}`, margem, 41)

  autoTable(doc, {
    startY: 48,
    head: [['Data', 'Horário', 'Modalidade', 'Local', { content: 'Valor', styles: { halign: 'right' } }]],
    body: linhasDaTabela(d),
    margin: { left: margem, right: margem },
    styles: { fontSize: 10, cellPadding: 2.5, textColor: [30, 41, 59] },
    headStyles: { fillColor: [15, 37, 55], textColor: 255 },
    alternateRowStyles: { fillColor: [244, 247, 250] },
    columnStyles: { 4: { halign: 'right' } },
  })

  let y = (doc as unknown as { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ?? 60
  y += 8
  doc.setFontSize(11)
  if (d.modelo === 'mensal') {
    doc.text('Mensalidade: valor fixo do ciclo', margem, y)
    y += 6
  }
  if (d.ajuste !== 0) {
    const sinal = d.ajuste > 0 ? '+' : '-'
    const texto = `Ajuste${d.ajusteDescricao ? ` (${d.ajusteDescricao})` : ''}: ${sinal} ${formatarBRL(Math.abs(d.ajuste))}`
    doc.text(doc.splitTextToSize(texto, largura - margem * 2), margem, y)
    y += 6
  }
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(13)
  doc.setTextColor(15, 37, 55)
  doc.text(resumoTotalRelatorio(d), margem, y + 2)

  const rodape = 'Gerado via Treino · Personal Perto'
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)
  doc.setTextColor(100, 116, 139)
  doc.text(rodape, largura / 2, doc.internal.pageSize.getHeight() - 10, { align: 'center' })
  return doc
}

/** Gera e baixa o PDF com o nome relatorio-[aluno]-[mês-ano].pdf. */
export async function baixarRelatorioPdf(d: DadosRelatorio): Promise<void> {
  const doc = await construirRelatorioPdf(d)
  doc.save(nomeArquivoRelatorio(d.alunoNome, d.periodoFim))
}
