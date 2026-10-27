import { describe, expect, it } from 'vitest'
import { AA_TEXTO_NORMAL, AA_TEXTO_GRANDE_OU_UI, contrasteWCAG } from './contraste'

// Mantém em sincronia com src/index.css (@theme) — se alguma cor da marca
// mudar lá, este teste quebra e força reconferir o contraste. Ver
// docs/BRAND.md pra origem de cada valor e por que brand ≠ brand-bright.
const BRANCO = '#ffffff'
const BRAND = '#367c39'
const BRAND_HOVER = '#2a602c'
const BRAND_SOFT = '#eaf6ea'
const BRAND_BRIGHT = '#388e3c'
const ACCENT = '#0f2537'
const SLATE_900 = '#0f172a'
const SLATE_50 = '#f8fafc'
const SLATE_100 = '#f1f5f9'
const SLATE_400 = '#94a3b8'
const SLATE_500 = '#64748b'
const SLATE_600 = '#475569'

describe('contraste do tema (WCAG AA)', () => {
  it('brand com texto branco passa AA (botões/chips selecionados)', () => {
    expect(contrasteWCAG(BRAND, BRANCO)).toBeGreaterThanOrEqual(AA_TEXTO_NORMAL)
  })
  it('brand-hover com texto branco passa AA (estado active/hover)', () => {
    expect(contrasteWCAG(BRAND_HOVER, BRANCO)).toBeGreaterThanOrEqual(AA_TEXTO_NORMAL)
  })
  it('brand-hover como texto sobre branco e sobre brand-soft passa AA (links, texto em badges)', () => {
    expect(contrasteWCAG(BRAND_HOVER, BRANCO)).toBeGreaterThanOrEqual(AA_TEXTO_NORMAL)
    expect(contrasteWCAG(BRAND_HOVER, BRAND_SOFT)).toBeGreaterThanOrEqual(AA_TEXTO_NORMAL)
  })
  it('brand-bright passa o limiar de texto grande/ícone (3:1), mas NÃO o de texto normal — não usar em corpo de texto', () => {
    expect(contrasteWCAG(BRAND_BRIGHT, BRANCO)).toBeGreaterThanOrEqual(AA_TEXTO_GRANDE_OU_UI)
    expect(contrasteWCAG(BRAND_BRIGHT, BRANCO)).toBeLessThan(AA_TEXTO_NORMAL)
  })
  it('accent (navy do Personal Perto) com texto branco passa AA', () => {
    expect(contrasteWCAG(ACCENT, BRANCO)).toBeGreaterThanOrEqual(AA_TEXTO_NORMAL)
  })
  it('verde de marca sobre fundo escuro (toast de desfazer) passa AA', () => {
    // #5fba63 é o mesmo matiz do brand, clareado pra funcionar sobre slate-900 (UndoToast).
    expect(contrasteWCAG('#5fba63', SLATE_900)).toBeGreaterThanOrEqual(AA_TEXTO_NORMAL)
  })
  it('texto secundário: slate-500 passa AA sobre branco e slate-50; sobre slate-100 usar slate-600; slate-400 NÃO serve para texto', () => {
    expect(contrasteWCAG(SLATE_500, BRANCO)).toBeGreaterThanOrEqual(AA_TEXTO_NORMAL)
    expect(contrasteWCAG(SLATE_500, SLATE_50)).toBeGreaterThanOrEqual(AA_TEXTO_NORMAL)
    expect(contrasteWCAG(SLATE_600, SLATE_100)).toBeGreaterThanOrEqual(AA_TEXTO_NORMAL)
    expect(contrasteWCAG(SLATE_400, BRANCO)).toBeLessThan(AA_TEXTO_GRANDE_OU_UI)
  })
})

// Guarda: `text-slate-400` (contraste ~2,6:1 sobre branco) só em ícone decorativo (componente lucide); texto usa slate-500/600.
import fs from 'node:fs'
import path from 'node:path'

describe('text-slate-400 só em ícone decorativo', () => {
  const raiz = path.join(import.meta.dirname, '..')
  const achados: string[] = []
  const varre = (dir: string) => {
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
      const p = path.join(dir, e.name)
      if (e.isDirectory()) varre(p)
      else if (/\.tsx$/.test(e.name) && !/\.test\./.test(e.name)) {
        fs.readFileSync(p, 'utf8').split('\n').forEach((linha, i) => {
          if (linha.includes('text-slate-400') && !/<[A-Z][A-Za-z0-9]*\b[^>]*text-slate-400/.test(linha)) achados.push(`${path.relative(raiz, p)}:${i + 1}`)
        })
      }
    }
  }
  varre(raiz)
  it('nenhum texto em slate-400', () => expect(achados).toEqual([]))
})

// Pílulas do painel /admin (src/features/admin): fundo claro + texto escuro da mesma família (Tailwind v4 / paleta padrão).
describe('contraste das pílulas do /admin (WCAG AA)', () => {
  const pares: [string, string, string][] = [
    ['trial: amber-50 / amber-700', '#fffbeb', '#b45309'],
    ['vencido há dias (laranja): orange-50 / orange-700', '#fff7ed', '#c2410c'],
    ['expirada e vermelho: red-50 / red-700', '#fef2f2', '#b91c1c'],
    ['cancelada: slate-100 / slate-600', '#f1f5f9', '#475569'],
    ['LGPD confirmados: emerald-100 / emerald-800', '#d1fae5', '#065f46'],
    ['LGPD pendentes: amber-100 / amber-900', '#fef3c7', '#78350f'],
    ['LGPD negados: red-100 / red-800', '#fee2e2', '#991b1b'],
    ['LGPD não solicitados: slate-100 / slate-700', '#f1f5f9', '#334155'],
    ['sinal de abuso (indicações): white / amber-800', '#ffffff', '#92400e'],
    ['botão Revogar: white / red-700', '#ffffff', '#b91c1c'],
    ['etiqueta mês grátis: brand-soft / brand-hover', '#eaf6ea', '#2a602c'],
  ]
  for (const [nome, fundo, texto] of pares) {
    it(nome, () => expect(contrasteWCAG(texto, fundo)).toBeGreaterThanOrEqual(AA_TEXTO_NORMAL))
  }
})
