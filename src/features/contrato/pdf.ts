import { montarContrato, type DadosContrato } from './contrato'

const MARGEM = 20
const LARGURA = 210 - MARGEM * 2
const RODAPE_Y = 287
const LIMITE_Y = 275
const ENTRELINHA = 5

const semAcento = (t: string): string => t.normalize('NFD').replace(/[̀-ͯ]/g, '')

/** contrato-maria-souza-2026.pdf */
export function nomeArquivoContrato(alunoNome: string, geradoEmISO: string): string {
  const slug = semAcento(alunoNome).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'aluno'
  return `contrato-${slug}-${geradoEmISO.slice(0, 4)}.pdf`
}

/** Desenha o contrato em A4: texto corrido com quebra de página, assinaturas no fim e rodapé com o aviso do modelo. */
export async function gerarContratoPdf(d: DadosContrato, { comprimir = true }: { comprimir?: boolean } = {}) {
  const { jsPDF } = await import('jspdf')
  const doc = new jsPDF({ unit: 'mm', format: 'a4', compress: comprimir })
  const t = montarContrato(d)
  let y = MARGEM

  const garantir = (altura: number) => {
    if (y + altura > LIMITE_Y) {
      doc.addPage()
      y = MARGEM
    }
  }
  const paragrafo = (texto: string, { negrito = false, tamanho = 10, depois = 2, recuo = 0 }: { negrito?: boolean; tamanho?: number; depois?: number; recuo?: number } = {}) => {
    doc.setFont('helvetica', negrito ? 'bold' : 'normal')
    doc.setFontSize(tamanho)
    const linhas = doc.splitTextToSize(texto, LARGURA - recuo) as string[]
    for (const l of linhas) {
      garantir(ENTRELINHA)
      doc.text(l, MARGEM + recuo, y)
      y += ENTRELINHA
    }
    y += depois
  }

  doc.setTextColor(30, 41, 59)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(13)
  for (const l of doc.splitTextToSize(t.titulo, LARGURA) as string[]) {
    doc.text(l, 105, y, { align: 'center' })
    y += 6
  }
  y += 4
  paragrafo(t.abertura, { depois: 3 })
  for (const p of t.partes) paragrafo(p, { depois: 2 })
  y += 2

  for (const c of t.clausulas) {
    garantir(ENTRELINHA * 3)
    paragrafo(c.titulo, { negrito: true, depois: 1 })
    for (const p of c.paragrafos) paragrafo(p, { depois: 1.5 })
    y += 2
  }

  paragrafo(t.fecho, { depois: 4 })
  paragrafo(t.localData, { depois: 12 })

  garantir(48)
  const colunas = [MARGEM, MARGEM + LARGURA / 2 + 4]
  const larguraLinha = LARGURA / 2 - 8
  t.assinaturas.forEach((a, i) => {
    const x = colunas[i % 2]
    if (i > 0 && i % 2 === 0) {
      y += 24
      garantir(24)
    }
    const yLinha = y + 10
    doc.setDrawColor(100, 116, 139)
    doc.setLineWidth(0.3)
    doc.line(x, yLinha, x + larguraLinha, yLinha)
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(8)
    doc.text(a.rotulo, x, yLinha + 4)
    if (a.nome) {
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(9)
      doc.text(doc.splitTextToSize(a.nome, larguraLinha) as string[], x, yLinha + 8.5)
    }
  })

  const paginas = doc.getNumberOfPages()
  for (let i = 1; i <= paginas; i++) {
    doc.setPage(i)
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(7.5)
    doc.setTextColor(100, 116, 139)
    doc.text('Modelo-padrão do Treino · Personal Perto. Não substitui orientação jurídica: recomenda-se revisão antes do uso.', MARGEM, RODAPE_Y)
    doc.text(`${i}/${paginas}`, 210 - MARGEM, RODAPE_Y, { align: 'right' })
  }
  return doc
}

export async function baixarContrato(d: DadosContrato): Promise<void> {
  const doc = await gerarContratoPdf(d)
  doc.save(nomeArquivoContrato(d.aluno.nome, d.geradoEm))
}
