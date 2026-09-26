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
})
