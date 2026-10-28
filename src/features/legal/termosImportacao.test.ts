import { describe, expect, it } from 'vitest'
import { TERMOS_USO_TEXTO } from './textos'
import { LIXEIRA_DIAS } from '../alunos/apagarAluno'
import { LIMITE_IMPORTACAO } from '../alunos/importar/importarAlunos'
import { VALIDADES_HORAS, VALIDADE_MAXIMA_HORAS } from '../../../supabase/functions/_shared/execucao'

// A cláusula 3.5 descreve a importação; o limite e as promessas precisam bater com o código.
const c35 = TERMOS_USO_TEXTO.slice(TERMOS_USO_TEXTO.indexOf('3.5. Importação de alunos'), TERMOS_USO_TEXTO.indexOf('3.6. Exportação de alunos'))
const c36 = TERMOS_USO_TEXTO.slice(TERMOS_USO_TEXTO.indexOf('3.6. Exportação de alunos'), TERMOS_USO_TEXTO.indexOf('3.7. Mensagens aos alunos'))

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

// Termos 1.6: as promessas novas precisam bater com o produto.
describe('Termos 1.6 × produto', () => {
  it('1.4: a plataforma não intermedeia pagamento entre personal e aluno (igual à landing)', () => {
    expect(TERMOS_USO_TEXTO).toContain('1.4. Pagamentos entre Personal Trainer e aluno')
    expect(TERMOS_USO_TEXTO).toContain('não recebe, não intermedeia e não repassa valores')
  })
  it('2.9: uso aceitável e suspensão, com a saída pela exportação (3.6)', () => {
    expect(TERMOS_USO_TEXTO).toContain('2.9. Uso aceitável e suspensão')
    expect(TERMOS_USO_TEXTO).toMatch(/baixar os seus alunos \(cláusula 3\.6\)/)
  })
  it('3.7: mensagens aos alunos sem dado de saúde', () => {
    expect(TERMOS_USO_TEXTO).toContain('3.7. Mensagens aos alunos')
    expect(TERMOS_USO_TEXTO).toContain('não levam dados de saúde')
  })
  it('3.8: a validade do link do treino à distância (24 h a 30 dias) é a do código', () => {
    expect(Math.min(...VALIDADES_HORAS)).toBe(24)
    expect(VALIDADE_MAXIMA_HORAS).toBe(30 * 24)
    expect(TERMOS_USO_TEXTO).toContain('de 24 horas a 30 dias')
  })
  it('3.9: a lixeira de 30 dias é a do app', () => {
    expect(LIXEIRA_DIAS).toBe(30)
    expect(TERMOS_USO_TEXTO).toContain('fica 30 (trinta) dias na lixeira')
  })
  it('9: o suporte cita os canais que existem no app', () => {
    expect(TERMOS_USO_TEXTO).toContain('Central de ajuda e botão "Reportar um problema"')
  })
})
