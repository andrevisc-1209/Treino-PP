import { describe, expect, it } from 'vitest'
import { OBJETIVOS } from '../opcoes'
import { LIMITE_IMPORTACAO, lerPlanilha } from './importarAlunos'
import { CABECALHO_CSV, OBJETIVOS_DO_PROMPT, limparTextoColado, montarPromptIA } from './promptIA'

const prompt = montarPromptIA()

describe('prompt para IA', () => {
  it('traz o cabeçalho exato, o limite e todos os objetivos do app (menos "Outros")', () => {
    expect(CABECALHO_CSV).toBe('nome;telefone;email;nascimento;sexo;objetivos')
    expect(prompt).toContain(`exatamente assim: ${CABECALHO_CSV}`)
    expect(prompt).toContain(`no máximo ${LIMITE_IMPORTACAO} alunos`)
    for (const o of OBJETIVOS.filter((x) => x !== 'Outros')) expect(prompt).toContain(o)
    expect(OBJETIVOS_DO_PROMPT).not.toContain('Outros')
  })
  it('proíbe inventar e dado de saúde, CPF, senha e valores', () => {
    expect(prompt).toMatch(/NUNCA invente/)
    for (const t of ['lesões', 'cirurgias', 'medicamentos', 'CPF', 'senha', 'mensalidade']) expect(prompt).toContain(t)
  })
  it('o exemplo do prompt é lido pela importação sem erro nem aviso', () => {
    const bloco = prompt.slice(prompt.indexOf('```csv') + 6, prompt.indexOf('```', prompt.indexOf('```csv') + 6))
    const r = lerPlanilha(limparTextoColado(bloco), [], '2026-10-28')
    if (!r.ok) throw new Error(r.erro)
    expect(r.linhas.map((l) => l.status)).toEqual(['ok'])
  })
})

describe('limparTextoColado', () => {
  const csv = 'nome;telefone\nAna;(11) 91234-5678'
  it('tira o bloco de código da resposta da IA (com ou sem "csv")', () => {
    expect(limparTextoColado('```csv\n' + csv + '\n```')).toBe(csv)
    expect(limparTextoColado('```\n' + csv + '\n```\n')).toBe(csv)
    expect(limparTextoColado('csv\n' + csv)).toBe(csv)
  })
  it('deixa passar texto puro e tira só as pontas', () => {
    expect(limparTextoColado('\n\n' + csv + '\n\n')).toBe(csv)
  })
  it('o texto limpo é lido pela importação', () => {
    const r = lerPlanilha(limparTextoColado('```csv\n' + csv + '\n```'), [], '2026-10-28')
    expect(r.ok).toBe(true)
  })
})
