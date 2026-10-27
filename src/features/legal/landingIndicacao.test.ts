import fs from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'
import { TERMOS_USO_TEXTO } from './textos'
import { ALUNOS_PARA_GANHAR } from '../indicacao/indicacao'

// A landing promete o programa de indicação; a regra de verdade está nos Termos (cláusula 2.7) e no banco. Se um dos lados mudar, este teste aponta.
const landing = fs.readFileSync(path.join(import.meta.dirname, '..', '..', '..', 'public', 'landing.html'), 'utf8')
const clausula = TERMOS_USO_TEXTO.slice(TERMOS_USO_TEXTO.indexOf('2.7. Programa de indicação'), TERMOS_USO_TEXTO.indexOf('3. Dados dos alunos e LGPD'))

describe('landing × Termos (programa de indicação)', () => {
  it('a landing diz a mesma regra dos Termos: 3 alunos, 1 mês grátis para os dois, até 6 meses para quem indica', () => {
    expect(ALUNOS_PARA_GANHAR).toBe(3)
    for (const trecho of ['cadastra 3 alunos', 'vocês dois ganham 1 mês grátis', 'até 6 meses']) expect(landing).toContain(trecho)
    expect(clausula).toContain('3 (três) ou mais alunos')
    expect(clausula).toContain('1 (um) mês')
    expect(clausula).toContain('até 6 (seis) meses')
  })
  it('a landing manda para os Termos e tem a pergunta no FAQ que o link "Como funciona" abre', () => {
    expect(landing).toContain('id="faq-indicacao"')
    expect(landing).toContain('href="#faq-indicacao"')
    expect(landing).toMatch(/href="\/termos"[^>]*>Termos de Uso/)
  })
  it('não promete dinheiro nem prazo que os Termos não prometem', () => {
    const bloco = landing.slice(landing.indexOf('id="faq-indicacao"'), landing.indexOf('</details>', landing.indexOf('id="faq-indicacao"')))
    expect(bloco).not.toMatch(/dinheiro|R\$|comissão|ilimitad/i)
  })
})
