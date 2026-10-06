// Gera a imagem do resumo (canvas puro, sem dependência) para compartilhar.
// Nunca recebe prontidão/bem-estar: são dados de saúde (LGPD).

export type DadosImagem = {
  data: string
  /** ex.: "Treino #27 · 3º da semana" */
  contexto: string | null
  volume: string
  rotuloVolume: string
  variacao: string
  exercicios: string
  series: string
  repeticoes: string
  destaque: string | null
  evolucao: string | null
  recorde: string | null
  pse: string
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
  ctx.fillText([d.data, d.contexto].filter(Boolean).join(' · '), W / 2, 210, 960)

  // card principal: volume
  ctx.fillStyle = '#367c39'
  arredondado(ctx, 70, 260, 940, 270, 36)
  ctx.fill()
  ctx.fillStyle = '#d5e1ea'
  ctx.font = fonte(600, 34)
  ctx.fillText(d.rotuloVolume, W / 2, 322)
  ctx.fillStyle = '#ffffff'
  ctx.font = fonte(800, 108)
  ctx.fillText(d.volume, W / 2, 440, 860)
  ctx.fillStyle = '#e6f0e6'
  ctx.font = fonte(600, 34)
  ctx.fillText(d.variacao, W / 2, 495)

  // três números
  const mini = [
    ['Exercícios', d.exercicios],
    ['Séries', d.series],
    ['Repetições', d.repeticoes],
  ]
  mini.forEach(([rotulo, valor], i) => {
    const x = 70 + i * 325
    ctx.fillStyle = '#ffffff1a'
    arredondado(ctx, x, 570, 290, 190, 32)
    ctx.fill()
    ctx.fillStyle = '#d5e1ea'
    ctx.font = fonte(600, 30)
    ctx.fillText(rotulo, x + 145, 625)
    ctx.fillStyle = '#ffffff'
    ctx.font = fonte(800, 78)
    ctx.fillText(valor, x + 145, 720, 260)
  })

  // faixas opcionais
  let y = 800
  const faixa = (texto: string, fundo: string, cor: string) => {
    ctx.fillStyle = fundo
    arredondado(ctx, 70, y, 940, 110, 32)
    ctx.fill()
    ctx.fillStyle = cor
    ctx.font = fonte(700, 38)
    ctx.fillText(texto, W / 2, y + 70, 880)
    y += 135
  }
  if (d.destaque) faixa(`💪 ${d.destaque}`, '#ffffff1a', '#ffffff')
  if (d.evolucao) faixa(`📈 ${d.evolucao}`, '#ffffff1a', '#ffffff')
  if (d.recorde) faixa(`🏆 ${d.recorde}`, '#f5b94233', '#ffd98a')

  ctx.fillStyle = '#9fb3c4'
  ctx.font = fonte(500, 32)
  ctx.fillText(`PSE ${d.pse}`, W / 2, 1235)
  ctx.font = fonte(600, 34)
  ctx.fillText(d.marca, W / 2, 1295)
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
