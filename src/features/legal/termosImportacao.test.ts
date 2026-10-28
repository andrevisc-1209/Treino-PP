import { describe, expect, it } from 'vitest'
import { TERMOS_USO_TEXTO } from './textos'
import { LIMITE_IMPORTACAO } from '../alunos/importar/importarAlunos'

// A cláusula 3.5 descreve a importação; o limite e as promessas precisam bater com o código.
const c35 = TERMOS_USO_TEXTO.slice(TERMOS_USO_TEXTO.indexOf('3.5. Importação de alunos'), TERMOS_USO_TEXTO.indexOf('3.6. Exportação de alunos'))
const c36 = TERMOS_USO_TEXTO.slice(TERMOS_USO_TEXTO.indexOf('3.6. Exportação de alunos'), TERMOS_USO_TEXTO.indexOf('4. Disponibilidade'))

describe('Termos × importação e exportação de alunos', () => {
  it('o limite dos Termos é o do app', () => {
    expect(LIMITE_IMPORTACAO).toBe(50)
    expect(c35).toContain('até 50 (cinquenta)')
  })
  it('a 3.5 exige base legal, só dados básicos (sem saúde), proíbe lista de terceiros e fala de desfazer e de não guardar o arquivo', () => {
    expect(c35).toContain('base legal')
    expect(c35).toContain('apenas dados básicos')
    expect(c35).toMatch(/Dados de saúde .* não podem ser importados/)
    expect(c35).toMatch(/proibido importar listas de contatos compradas/)
    expect(c35).toContain('desfazer a importação')
    expect(c35).toContain('não guarda o arquivo enviado')
  })
  it('a 3.6 diz que o arquivo exportado não leva saúde e é responsabilidade do personal', () => {
    expect(c36).toContain('sem dados de saúde')
    expect(c36).toContain('fora da proteção da plataforma')
  })
  it('o fim do período é modo de consulta (o app abre só para consulta), não "acesso suspenso"', () => {
    expect(TERMOS_USO_TEXTO).toContain('modo de consulta')
    expect(TERMOS_USO_TEXTO).not.toContain('o acesso é suspenso até nova contratação')
  })
})
