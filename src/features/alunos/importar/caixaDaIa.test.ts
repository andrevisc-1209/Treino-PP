import fs from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'

// Guarda: a caixa "Cole aqui a resposta da IA" não pode oferecer preenchimento automático. O texto de exemplo dela cita "email" e o iPhone passava a
// sugerir o e-mail da própria pessoa por cima da lista colada (apareceu num vídeo de divulgação). Sem isso, o teclado mostra só o que é do teclado.
const fonte = fs.readFileSync(path.join(import.meta.dirname, 'ImportarAlunosPage.tsx'), 'utf8')
const caixa = fonte.slice(fonte.indexOf('id="texto-colado"'), fonte.indexOf('/>', fonte.indexOf('id="texto-colado"')))

describe('caixa de resposta da IA na importação', () => {
  it.each(['autoComplete="off"', 'autoCorrect="off"', 'spellCheck={false}', 'autoCapitalize="off"'])('tem %s', (atributo) => {
    expect(caixa).toContain(atributo)
  })
})
