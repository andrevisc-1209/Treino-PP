import fs from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'

// Guarda: no iPhone, campo de texto com fonte menor que 16px dá zoom na página ao receber o toque, e o zoom não volta (a barra de baixo fica
// cortada). A regra global em src/index.css garante 16px em tela de toque; este teste impede que ela seja apagada ou movida para dentro de um @layer
// (dentro de um layer, as classes text-sm/text-xs do Tailwind voltariam a vencer).
const css = fs.readFileSync(path.join(import.meta.dirname, '..', 'index.css'), 'utf8')

describe('zoom do iPhone nos campos de texto', () => {
  const bloco = css.match(/@media \(pointer: coarse\)\s*\{([\s\S]*?)\n\}/)

  it('há uma regra para tela de toque que põe 16px em input (de texto), textarea e select', () => {
    expect(bloco).not.toBeNull()
    const regra = bloco![1]
    expect(regra).toMatch(/\binput:not\(/)
    expect(regra).toMatch(/\btextarea\b/)
    expect(regra).toMatch(/\bselect\b/)
    expect(regra).toMatch(/font-size:\s*16px/)
  })

  it('a regra não mexe em checkbox, radio, botão nem arquivo', () => {
    for (const t of ['checkbox', 'radio', 'range', 'file', 'button', 'submit']) expect(bloco![1]).toContain(`[type='${t}']`)
  })

  it('a regra fica FORA de @layer (senão o text-sm do Tailwind vence)', () => {
    const antes = css.slice(0, css.indexOf('@media (pointer: coarse)'))
    const abre = (antes.match(/@layer[^{]*\{/g) ?? []).length
    const fecha = (antes.match(/\}/g) ?? []).length
    expect(abre).toBeLessThanOrEqual(fecha)
  })
})
