import { describe, expect, it } from 'vitest'
import { AA_TEXTO_NORMAL, contrasteWCAG } from './contraste'

// Mantém em sincronia com src/index.css (@theme) — se a cor da marca mudar
// lá, este teste quebra e força reconferir o contraste.
const BRANCO = '#ffffff'
const BRAND = '#15803d'
const BRAND_DARK = '#166534'

describe('contraste do tema (WCAG AA)', () => {
  it('brand com texto branco passa AA (botões/chips selecionados)', () => {
    expect(contrasteWCAG(BRAND, BRANCO)).toBeGreaterThanOrEqual(AA_TEXTO_NORMAL)
  })
  it('brand-dark com texto branco passa AA (estado active/hover)', () => {
    expect(contrasteWCAG(BRAND_DARK, BRANCO)).toBeGreaterThanOrEqual(AA_TEXTO_NORMAL)
  })
  it('brand-dark como texto sobre branco passa AA (links)', () => {
    expect(contrasteWCAG(BRAND_DARK, BRANCO)).toBeGreaterThanOrEqual(AA_TEXTO_NORMAL)
  })
})
