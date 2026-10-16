import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'
import ts from 'typescript'
import { describe, expect, it } from 'vitest'

// Regressão do bug "✏️ fecha o wizard": um <button> sem type é "submit" e, dentro de um <form>, envia o formulário inteiro
// (no cadastro/edição do aluno isso salvava e saía da tela). Todo <button> cru precisa declarar o type; o componente Button
// já usa type="button" por padrão.
function arquivosTsx(dir: string, saida: string[] = []): string[] {
  for (const nome of readdirSync(dir)) {
    const caminho = join(dir, nome)
    if (statSync(caminho).isDirectory()) arquivosTsx(caminho, saida)
    else if (caminho.endsWith('.tsx')) saida.push(caminho)
  }
  return saida
}

describe('botões', () => {
  it('nenhum <button> do app fica sem type', () => {
    const sem: string[] = []
    for (const arquivo of arquivosTsx('src')) {
      const sf = ts.createSourceFile(arquivo, readFileSync(arquivo, 'utf8'), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX)
      const visitar = (n: ts.Node) => {
        if ((ts.isJsxOpeningElement(n) || ts.isJsxSelfClosingElement(n)) && n.tagName.getText() === 'button') {
          const atributos = n.attributes.properties
          const temType = atributos.some((a) => ts.isJsxAttribute(a) && a.name.getText() === 'type')
          const temSpread = atributos.some((a) => ts.isJsxSpreadAttribute(a)) // o componente Button repassa o type que recebe
          if (!temType && !temSpread) sem.push(`${arquivo}:${sf.getLineAndCharacterOfPosition(n.getStart()).line + 1}`)
        }
        ts.forEachChild(n, visitar)
      }
      visitar(sf)
    }
    expect(sem).toEqual([])
  })

  it('o componente Button usa type="button" por padrão', () => {
    const fonte = readFileSync('src/components/ui.tsx', 'utf8')
    expect(fonte).toMatch(/type = 'button'/)
  })
})
