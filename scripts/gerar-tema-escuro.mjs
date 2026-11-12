// Gera src/tema-escuro.css a partir das cores do Tailwind (node_modules/tailwindcss/theme.css).
// Rode: node scripts/gerar-tema-escuro.mjs
// Técnica: no modo escuro do sistema (prefers-color-scheme), cada escala usada no app é espelhada (50<->950, 100<->900, ...),
// então fundo claro vira fundo escuro e texto escuro vira texto claro sem tocar em nenhum componente. A escala "slate" (superfícies e
// texto) tem valores escolhidos à mão para dar hierarquia de superfície. Texto de marca e superfícies escuras (toast) têm ajustes à parte.
// .tema-claro (recibo, documentos) volta às cores originais dentro do modo escuro.
import { readFileSync, writeFileSync } from 'node:fs'

const ESCALAS = ['red', 'amber', 'emerald', 'orange', 'sky', 'violet', 'teal', 'rose', 'lime', 'indigo', 'cyan']
const PASSOS = [50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950]
const tema = readFileSync(new URL('../node_modules/tailwindcss/theme.css', import.meta.url), 'utf8')

// ---- oklch -> hex (sRGB) ----
function oklchParaHex(texto) {
  const m = texto.match(/oklch\(([\d.]+)%\s+([\d.]+)\s+([\d.]+)\)/)
  const L = Number(m[1]) / 100, C = Number(m[2]), h = (Number(m[3]) * Math.PI) / 180
  const a = C * Math.cos(h), b = C * Math.sin(h)
  const l_ = L + 0.3963377774 * a + 0.2158037573 * b, m_ = L - 0.1055613458 * a - 0.0638541728 * b, s_ = L - 0.0894841775 * a - 1.291485548 * b
  const l = l_ ** 3, mm = m_ ** 3, s = s_ ** 3
  const lin = [4.0767416621 * l - 3.3077115913 * mm + 0.2309699292 * s, -1.2684380046 * l + 2.6097574011 * mm - 0.3413193965 * s, -0.0041960863 * l - 0.7034186147 * mm + 1.707614701 * s]
  return '#' + lin.map((c) => { const v = Math.min(1, Math.max(0, c)); const g = v <= 0.0031308 ? 12.92 * v : 1.055 * v ** (1 / 2.4) - 0.055; return Math.round(g * 255).toString(16).padStart(2, '0') }).join('')
}
const cor = (nome, passo) => {
  const m = tema.match(new RegExp(`--color-${nome}-${passo}:\\s*(oklch\\([^)]*\\))`))
  if (!m) throw new Error(`sem ${nome}-${passo}`)
  return oklchParaHex(m[1])
}

// ---- slate: superfícies e texto escolhidos à mão ----
export const SLATE_ESCURO = { 50: '#0b1220', 100: '#1a2438', 200: '#263149', 300: '#35425c', 400: '#7e8ba3', 500: '#9ba8bd', 600: '#b4bfd0', 700: '#cad2df', 800: '#e0e6ee', 900: '#f1f5f9', 950: '#f8fafc' }
export const CARTAO_ESCURO = '#131c2e' // o "branco" dos cartões
const BRAND_SOFT_ESCURO = '#16301b'
const TEXTO_MARCA = '#6fc376'
const TEXTO_MARCA_FORTE = '#8fd694'

const claro = {}, escuro = {}
for (const p of PASSOS) {
  claro[`slate-${p}`] = cor('slate', p)
  escuro[`slate-${p}`] = SLATE_ESCURO[p]
}
for (const e of ESCALAS) for (const p of PASSOS) {
  claro[`${e}-${p}`] = cor(e, p)
  escuro[`${e}-${p}`] = cor(e, 1000 - p === 50 ? 50 : PASSOS[PASSOS.length - 1 - PASSOS.indexOf(p)])
}
claro['brand-soft'] = '#eaf6ea'
escuro['brand-soft'] = BRAND_SOFT_ESCURO

// ---- ajustes por classe (a mesma cor tem papéis diferentes: fundo x texto) ----
const AJUSTES_ESCURO = [
  ['.bg-white', `background-color:${CARTAO_ESCURO}`],
  ['.border-white', `border-color:${CARTAO_ESCURO}`],
  ['.ring-white', `--tw-ring-color:${CARTAO_ESCURO}`],
  ['.bg-slate-900', 'background-color:#334155'], // toast e faixas escuras: ficam escuras, mas se destacam do fundo
  ['.bg-slate-900\\/50', 'background-color:rgb(0 0 0 / 0.6)'],
  ['.text-brand', `color:${TEXTO_MARCA}`],
  ['.text-brand-bright', `color:${TEXTO_MARCA}`],
  ['.text-brand-hover', `color:${TEXTO_MARCA_FORTE}`],
  ['.text-accent', 'color:#cfe0ef'],
  ['.logo-marca', 'background-color:#ffffff;border-radius:0.75rem;padding:0.2rem 0.6rem'],
]
const AJUSTES_CLARO = [
  ['.bg-white', 'background-color:#ffffff'],
  ['.border-white', 'border-color:#ffffff'],
  ['.ring-white', '--tw-ring-color:#ffffff'],
  ['.bg-slate-900', 'background-color:#0f172a'],
  ['.bg-slate-900\\/50', 'background-color:rgb(15 23 42 / 0.5)'],
  ['.text-brand', 'color:#367c39'],
  ['.text-brand-bright', 'color:#388e3c'],
  ['.text-brand-hover', 'color:#2a602c'],
  ['.text-accent', 'color:#0f2537'],
  ['.logo-marca', 'background-color:transparent;border-radius:0;padding:0'],
]

const vars = (o) => Object.entries(o).map(([k, v]) => `    --color-${k}: ${v};`).join('\n')
const regras = (lista, prefixo) => lista.map(([s, d]) => `  ${prefixo}${s} { ${d}; }`).join('\n')

const css = `/* GERADO por scripts/gerar-tema-escuro.mjs. Não edite à mão: mude o script e rode de novo. */
/* Modo escuro: segue o sistema (prefers-color-scheme). Escalas espelhadas; superfícies e texto de marca ajustados. */
@media (prefers-color-scheme: dark) {
  :root {
    color-scheme: dark;
${vars(escuro)}
  }
${regras(AJUSTES_ESCURO, '')}
  :focus-visible { outline-color: ${TEXTO_MARCA}; }
  .bg-brand:focus-visible { box-shadow: 0 0 0 2px ${CARTAO_ESCURO}; }
  /* Áreas que precisam continuar claras (recibo, documentos): voltam às cores originais */
  .tema-claro {
    color-scheme: light;
${vars(claro).replace(/^ {4}/gm, '    ')}
  }
${regras(AJUSTES_CLARO, '.tema-claro ')}
}
`
writeFileSync(new URL('../src/tema-escuro.css', import.meta.url), css)
console.log('ok', Object.keys(escuro).length, 'variáveis')
