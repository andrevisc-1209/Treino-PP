// Gera todos os ícones do app a partir de src/assets/brand/icon-mark.png —
// reproduzível, roda com `npm run icons` sempre que a logo mudar.
import sharp from 'sharp'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const raiz = path.resolve(__dirname, '..')
const fonte = path.join(raiz, 'src/assets/brand/icon-mark.png')
const publicDir = path.join(raiz, 'public')

const BRAND = '#367c39'

/**
 * Símbolo centrado num quadrado de fundo sólido da marca. `areaSegura` é a
 * fração do quadrado que o símbolo pode ocupar — 0.88 pros ícones normais,
 * 0.8 pro maskable (o SO pode recortar até 20% de qualquer lado).
 */
async function icone(tamanho, areaSegura, destino) {
  const alvo = Math.round(tamanho * areaSegura)
  const logo = await sharp(fonte).resize(alvo, alvo, { fit: 'inside' }).toBuffer()
  const logoMeta = await sharp(logo).metadata()
  await sharp({ create: { width: tamanho, height: tamanho, channels: 4, background: BRAND } })
    .composite([{ input: logo, left: Math.round((tamanho - logoMeta.width) / 2), top: Math.round((tamanho - logoMeta.height) / 2) }])
    .png()
    .toFile(destino)
}

async function main() {
  await icone(192, 0.88, path.join(publicDir, 'pwa-192x192.png'))
  await icone(512, 0.88, path.join(publicDir, 'pwa-512x512.png'))
  await icone(512, 0.8, path.join(publicDir, 'maskable-icon-512x512.png')) // área segura maskable

  // apple-touch-icon: fundo sólido, sem transparência (iOS não aceita alfa aqui).
  await icone(180, 0.88, path.join(publicDir, 'apple-touch-icon.png'))

  // favicon: sem SVG oficial, gera PNG nos dois tamanhos comuns.
  await icone(32, 0.88, path.join(publicDir, 'favicon-32x32.png'))
  await icone(16, 0.88, path.join(publicDir, 'favicon-16x16.png'))

  console.log('Ícones gerados em public/.')
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
