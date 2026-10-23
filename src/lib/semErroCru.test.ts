import fs from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'

// Mensagem técnica do banco/Supabase (ex.: "new row violates row-level security policy...") nunca vai para a tela: o texto passa por
// mapearErroSupabase (src/lib/erros.ts). Mensagem já escrita em português pelo app vira `new ErroAmigavel(...)`, que o mapeador respeita.
// Só é permitido ler `(e as Error).message` para CLASSIFICAR o erro (em minúsculas), nunca para exibir.
const RAIZ = path.join(import.meta.dirname, '..')

function arquivos(dir: string): string[] {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const p = path.join(dir, e.name)
    if (e.isDirectory()) return arquivos(p)
    return /\.tsx?$/.test(e.name) && !/\.test\./.test(e.name) ? [p] : []
  })
}

describe('nenhuma mensagem de erro crua na interface', () => {
  const crus: string[] = []
  for (const arquivo of arquivos(RAIZ)) {
    fs.readFileSync(arquivo, 'utf8')
      .split('\n')
      .forEach((linha, i) => {
        if (!/as Error\)\??\.message/.test(linha)) return
        if (/\.message\?*\.toLowerCase\(\)/.test(linha)) return // classificação interna, não exibição
        crus.push(`${path.relative(RAIZ, arquivo)}:${i + 1}`)
      })
  }

  it('usa mapearErroSupabase em vez de (e as Error).message', () => expect(crus).toEqual([]))
})
