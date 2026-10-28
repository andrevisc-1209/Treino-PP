import fs from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'
import { PRIVACIDADE_TEXTO, TERMOS_USO_TEXTO } from './textos'
import { DIAS_CARENCIA, PALAVRA_CONFIRMACAO, TEXTO_APAGADO, TEXTO_RETIDO } from '../conta/exclusao'

// A tela, o banco e os textos legais precisam dizer a mesma coisa sobre a exclusão da conta. Este teste aponta a divergência.
const migration = fs.readFileSync(path.join(import.meta.dirname, '..', '..', '..', 'supabase', 'migrations', '20261074000000_exclusao_de_conta.sql'), 'utf8')

describe('exclusão de conta × textos legais × migration', () => {
  it('a carência é de 30 dias no app, no banco e nos textos', () => {
    expect(DIAS_CARENCIA).toBe(30)
    expect(migration).toMatch(/now\(\) \+ INTERVAL '30 days'/)
    expect(PRIVACIDADE_TEXTO).toContain('eliminados de vez em até 30 dias')
    expect(TERMOS_USO_TEXTO).toContain('até 30 (trinta) dias')
  })
  it('a confirmação é a mesma palavra no app e no banco', () => {
    expect(PALAVRA_CONFIRMACAO).toBe('EXCLUIR')
    expect(migration).toContain("'EXCLUIR'")
  })
  it('a retenção diz a mesma coisa: só o livro de pagamentos do plano, 5 anos, sem nome/CPF/e-mail', () => {
    expect(TEXTO_RETIDO).toContain('5 anos')
    expect(TEXTO_RETIDO).toContain('sem o seu nome, CPF ou e-mail')
    expect(PRIVACIDADE_TEXTO).toContain('apenas os registros dos pagamentos do plano')
    expect(PRIVACIDADE_TEXTO).toContain('sem nome, CPF ou e-mail')
    expect(TERMOS_USO_TEXTO).toContain('apenas os registros dos pagamentos do plano')
    expect(migration).toContain('titular_anonimo')
    expect(TEXTO_APAGADO).toContain('alunos')
  })
  it('a Política não promete mais 90 dias para o personal nem guardar faturas dos alunos ou consentimento depois da exclusão', () => {
    expect(PRIVACIDADE_TEXTO).not.toMatch(/mesmo após a exclusão dos demais dados/)
    expect(PRIVACIDADE_TEXTO).not.toMatch(/Registros financeiros \(cobranças e faturas\)/)
  })
})
