// Gera os ícones PWA a partir de SVGs simples (halter estilizado).
// Os PNGs já estão em public/; só rode de novo se mudar o desenho.
// Requer sharp (não é dependência do projeto): npm install -D sharp
// Rodar com: node scripts/generate-icons.mjs
import { mkdirSync } from 'node:fs'
import sharp from 'sharp'

const BRAND = '#16a34a'

mkdirSync('public', { recursive: true })

// Halter em branco, escala "full" (usada no ícone padrão, com respiro) e
// "safe" (menor, para o miolo seguro do ícone maskable).
function halter(scale) {
  const s = scale
  return `
    <g fill="none" stroke="white" stroke-width="${34 * s}" stroke-linecap="round">
      <line x1="${256 - 130 * s}" y1="256" x2="${256 + 130 * s}" y2="256" />
    </g>
    <g fill="white">
      <rect x="${256 - 170 * s}" y="${256 - 70 * s}" width="${40 * s}" height="${140 * s}" rx="${12 * s}" />
      <rect x="${256 + 130 * s}" y="${256 - 70 * s}" width="${40 * s}" height="${140 * s}" rx="${12 * s}" />
      <rect x="${256 - 200 * s}" y="${256 - 44 * s}" width="${28 * s}" height="${88 * s}" rx="${10 * s}" />
      <rect x="${256 + 172 * s}" y="${256 - 44 * s}" width="${28 * s}" height="${88 * s}" rx="${10 * s}" />
    </g>
  `
}

const iconPadrao = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
  <rect width="512" height="512" rx="96" fill="${BRAND}" />
  ${halter(1)}
</svg>`

const iconMaskable = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
  <rect width="512" height="512" fill="${BRAND}" />
  ${halter(0.62)}
</svg>`

const alvos = [
  { svg: iconPadrao, out: 'public/pwa-192x192.png', size: 192 },
  { svg: iconPadrao, out: 'public/pwa-512x512.png', size: 512 },
  { svg: iconMaskable, out: 'public/maskable-icon-512x512.png', size: 512 },
  { svg: iconPadrao, out: 'public/apple-touch-icon.png', size: 180 },
]

for (const { svg, out, size } of alvos) {
  await sharp(Buffer.from(svg)).resize(size, size).png().toFile(out)
  console.log('gerado', out)
}
