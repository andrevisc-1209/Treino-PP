import fs from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'

// Guarda: texto de tela nunca abaixo de 12 px (text-xs). 10/11 px é ilegível na academia, com sol e pressa.
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
            if (/text-\[(?:[0-9]|1[01])px\]/.test(linha)) achados.push(`${path.relative(raiz, p)}:${i + 1}`)
          })
      }
    }
  }
  varre(raiz)
  it('nenhum text-[Npx] com N menor que 12', () => expect(achados).toEqual([]))
})
