// Gera a imagem do resumo (canvas puro, sem dependência) para compartilhar.
// Nunca recebe prontidão/bem-estar: são dados de saúde (LGPD).

export type DadosImagem = {
  data: string
  volume: string
  variacao: string
  cargaInterna: string
  statusCarga: string
  duracao: string
  series: string
  pse: string
  recorde: string | null
  marca: string
}

const W = 1080
const H = 1350

function arredondado(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath()
  ctx.roundRect(x, y, w, h, r)
}

export function desenharResumo(canvas: HTMLCanvasElement, d: DadosImagem) {
  canvas.width = W
  canvas.height = H
  const ctx = canvas.getContext('2d')!
  const fonte = (peso: number, px: number) => `${peso} ${px}px system-ui, -apple-system, "Segoe UI", sans-serif`

  ctx.fillStyle = '#0f2537'
  ctx.fillRect(0, 0, W, H)

  ctx.textAlign = 'center'
  ctx.fillStyle = '#ffffff'
  ctx.font = fonte(800, 72)
  ctx.fillText('Treino concluído 🎉', W / 2, 150)
  ctx.fillStyle = '#9fb3c4'
  ctx.font = fonte(500, 36)
  ctx.fillText(d.data, W / 2, 210)

  const card = (x: number, y: number, w: number, h: number, rotulo: string, valor: string, sub: string, destaque = false) => {
    ctx.fillStyle = destaque ? '#367c39' : '#ffffff1a'
    arredondado(ctx, x, y, w, h, 36)
    ctx.fill()
    ctx.fillStyle = '#d5e1ea'
    ctx.font = fonte(600, 32)
    ctx.fillText(rotulo, x + w / 2, y + 62)
    ctx.fillStyle = '#ffffff'
    ctx.font = fonte(800, valor.length > 9 ? 56 : 68)
    ctx.fillText(valor, x + w / 2, y + 150)
    ctx.fillStyle = '#d5e1ea'
    ctx.font = fonte(500, 30)
    ctx.fillText(sub, x + w / 2, y + 205)
  }

  card(70, 270, 450, 250, 'Volume total', d.volume, d.variacao, true)
  card(560, 270, 450, 250, 'Carga interna', d.cargaInterna, d.statusCarga)

  card(70, 560, 450, 190, 'Duração', d.duracao, '')
  card(560, 560, 450, 190, 'Séries concluídas', d.series, '')
  card(70, 790, 940, 190, 'PSE (esforço percebido)', d.pse, '')

  if (d.recorde) {
    ctx.fillStyle = '#f5b94233'
    arredondado(ctx, 70, 1020, 940, 130, 36)
    ctx.fill()
    ctx.fillStyle = '#ffd98a'
    ctx.font = fonte(700, 36)
    ctx.fillText(`🏆 ${d.recorde}`, W / 2, 1100, 880)
  }

  ctx.fillStyle = '#9fb3c4'
  ctx.font = fonte(600, 34)
  ctx.fillText(d.marca, W / 2, 1270)
}

export async function compartilharResumo(d: DadosImagem): Promise<'compartilhado' | 'baixado' | 'cancelado'> {
  const canvas = document.createElement('canvas')
  desenharResumo(canvas, d)
  const blob: Blob | null = await new Promise((res) => canvas.toBlob(res, 'image/png'))
  if (!blob) throw new Error('Não foi possível gerar a imagem.')
  const arquivo = new File([blob], 'resumo-treino.png', { type: 'image/png' })

  if (navigator.canShare?.({ files: [arquivo] })) {
    try {
      await navigator.share({ files: [arquivo], title: 'Resumo do treino' })
      return 'compartilhado'
    } catch (e) {
      if ((e as DOMException).name === 'AbortError') return 'cancelado'
    }
  }
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = 'resumo-treino.png'
  a.click()
  setTimeout(() => URL.revokeObjectURL(url), 5000)
  return 'baixado'
}
