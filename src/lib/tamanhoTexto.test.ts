import fs from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'

// Guarda: texto de tela nunca abaixo de 13 px (text-xs vale 13 px, definido em src/index.css). 10/11 px é ilegível na academia, com sol e pressa.
describe('tamanho mínimo de texto', () => {
  const raiz = path.join(import.meta.dirname, '..')
  const achados: string[] = []
  const varre = (dir: string) => {
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
      const p = path.join(dir, e.name)
      if (e.isDirectory()) varre(p)
      else if (/\.tsx$/.test(e.name) && !/\.test\./.test(e.name)) {
        fs.readFileSync(p, 'utf8')
          .split('\n')
          .forEach((linha, i) => {
            if (/text-\[(?:[0-9]|1[01])px\]|text-\[0\.[0-9]+rem\]/.test(linha)) achados.push(`${path.relative(raiz, p)}:${i + 1}`)
          })
      }
    }
  }
  varre(raiz)
  it('nenhum text-[Npx] com N menor que 12', () => expect(achados).toEqual([]))
  it('text-xs está em 13 px no tema', () => {
    const css = fs.readFileSync(path.join(raiz, 'index.css'), 'utf8')
    expect(css).toMatch(/--text-xs:\s*0\.8125rem/)
  })
})

// Guarda: botões e chips tocáveis nunca com altura menor que 44 px (min-h-11) — alvo mínimo no celular.
describe('alvos de toque', () => {
  const raiz = path.join(import.meta.dirname, '..')
  const achados: string[] = []
  const varre = (dir: string) => {
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
      const p = path.join(dir, e.name)
      if (e.isDirectory()) varre(p)
      else if (/\.tsx$/.test(e.name) && !/\.test\./.test(e.name)) {
        fs.readFileSync(p, 'utf8')
          .split('\n')
          .forEach((linha, i) => {
            if (/\b(?:min-h|size)-(?:8|9|10)\b/.test(linha) && /(?:border|active:|onClick|<button|<a )/.test(linha) && !/<img|aria-hidden/.test(linha))
              achados.push(`${path.relative(raiz, p)}:${i + 1}`)
          })
      }
    }
  }
  varre(raiz)
  it('nenhum controle com min-h/size abaixo de 44 px', () => expect(achados).toEqual([]))
})
