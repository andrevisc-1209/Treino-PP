/** Foto opcional do personal na página pública. Imagem pequena em data URL, guardada no próprio cadastro (some com a conta). */

export const FOTO_LADO_PX = 256
/** Mesmo limite do banco (CHECK em professional_config.pagina_foto). */
export const FOTO_MAX_CHARS = 60000
/** Arquivo escolhido: acima disso nem tentamos ler (o celular tira fotos de 5 a 10 MB; reduzimos no aparelho). */
export const ARQUIVO_MAX_BYTES = 15 * 1024 * 1024

const FORMATO = /^data:image\/(?:webp|jpeg);base64,[A-Za-z0-9+/]+={0,2}$/

/** Só devolve a foto se for WebP ou JPEG em data URL e dentro do limite; qualquer outra coisa vira nulo (a página mostra a inicial). */
export function fotoValida(v: unknown): string | null {
  return typeof v === 'string' && v.length <= FOTO_MAX_CHARS && FORMATO.test(v) ? v : null
}

/** Recorte quadrado centralizado de uma imagem de largura x altura: de onde ler (sx, sy) e o lado. */
export function recorteQuadrado(largura: number, altura: number): { sx: number; sy: number; lado: number } {
  const lado = Math.min(largura, altura)
  return { sx: Math.round((largura - lado) / 2), sy: Math.round((altura - lado) / 2), lado }
}

/**
 * Lê a foto escolhida, recorta o quadrado do meio, reduz para 256 x 256 e codifica em WebP (ou JPEG, se o navegador não gerar WebP),
 * baixando a qualidade até caber no limite. Respeita a orientação do celular. Devolve a data URL ou uma mensagem do que fazer.
 */
export async function prepararFoto(arquivo: File): Promise<{ ok: true; foto: string } | { ok: false; erro: string }> {
  if (!arquivo.type.startsWith('image/')) return { ok: false, erro: 'Escolha uma imagem (foto).' }
  if (arquivo.size > ARQUIVO_MAX_BYTES) return { ok: false, erro: 'A imagem é grande demais. Escolha uma de até 15 MB.' }
  let bitmap: ImageBitmap
  try {
    bitmap = await createImageBitmap(arquivo, { imageOrientation: 'from-image' })
  } catch {
    return { ok: false, erro: 'Não consegui abrir essa imagem. Tente outra (JPG, PNG ou WebP).' }
  }
  try {
    const { sx, sy, lado } = recorteQuadrado(bitmap.width, bitmap.height)
    const canvas = document.createElement('canvas')
    canvas.width = FOTO_LADO_PX
    canvas.height = FOTO_LADO_PX
    const ctx = canvas.getContext('2d')
    if (!ctx) return { ok: false, erro: 'Não consegui preparar a imagem neste aparelho.' }
    ctx.drawImage(bitmap, sx, sy, lado, lado, 0, 0, FOTO_LADO_PX, FOTO_LADO_PX)
    for (const formato of ['image/webp', 'image/jpeg']) {
      for (const qualidade of [0.85, 0.7, 0.55, 0.4]) {
        const url = canvas.toDataURL(formato, qualidade)
        if (url.startsWith(`data:${formato};`) && fotoValida(url)) return { ok: true, foto: url }
      }
    }
    return { ok: false, erro: 'Não consegui reduzir essa imagem o bastante. Tente outra.' }
  } finally {
    bitmap.close()
  }
}
