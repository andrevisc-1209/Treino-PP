import fs from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'

// Guarda de segurança: o app é aberto a qualquer pessoa (cadastro de personal), então toda tabela do schema
// `treino` precisa de RLS e de grant EXPLÍCITO (o grant padrão ao cliente foi removido na migration 20261044).
const DIR = path.join(import.meta.dirname, 'migrations')
const sql = fs
  .readdirSync(DIR)
  .filter((f) => f.endsWith('.sql'))
  .sort()
  .map((f) => fs.readFileSync(path.join(DIR, f), 'utf8'))
  .join('\n')

const semComentarios = sql.replace(/--[^\n]*/g, '')
const tabelas = [...new Set([...semComentarios.matchAll(/CREATE TABLE(?: IF NOT EXISTS)? treino\.(\w+)/g)].map((m) => m[1]))].sort()

describe('migrations do schema treino', () => {
  it('encontra as tabelas', () => expect(tabelas.length).toBeGreaterThan(25))

  it.each(tabelas)('%s: RLS ligada', (t) => {
    expect(semComentarios).toMatch(new RegExp(`ALTER TABLE (IF EXISTS )?treino\\.${t}\\s+ENABLE ROW LEVEL SECURITY`))
  })

  it.each(tabelas)('%s: citada num GRANT ou REVOKE explícito', (t) => {
    expect(semComentarios).toMatch(new RegExp(`(GRANT|REVOKE)[^;]*treino\\.${t}\\b`))
  })

  it('o grant padrão ao cliente foi revogado para tabelas futuras', () => {
    expect(semComentarios).toMatch(/ALTER DEFAULT PRIVILEGES IN SCHEMA treino\s+REVOKE[^;]*FROM authenticated/)
  })

  it('is_admin não é atualizável pelo cliente (UPDATE só por coluna em professionals)', () => {
    const grantColuna = semComentarios.match(/GRANT UPDATE \(([^)]*)\)\s+ON treino\.professionals/g) ?? []
    expect(grantColuna.length).toBeGreaterThan(0)
    for (const g of grantColuna) expect(g).not.toContain('is_admin')
  })

  it('cpf: o cliente só grava pela RPC atualizar_cpf (REVOKE UPDATE (cpf) depois do GRANT por coluna; RPC sem acesso anônimo)', () => {
    const idxGrant = semComentarios.lastIndexOf('GRANT UPDATE (name, cpf')
    const idxRevoke = semComentarios.search(/REVOKE UPDATE \(cpf\) ON treino\.professionals FROM authenticated/)
    expect(idxGrant).toBeGreaterThan(-1)
    expect(idxRevoke).toBeGreaterThan(idxGrant)
    expect(semComentarios).toMatch(/REVOKE ALL ON FUNCTION treino\.atualizar_cpf\(TEXT\) FROM PUBLIC, anon/)
    expect(semComentarios).toMatch(/GRANT EXECUTE ON FUNCTION treino\.atualizar_cpf\(TEXT\) TO authenticated/)
    expect(semComentarios).toMatch(/SECURITY DEFINER\s+SET search_path = ''[\s\S]*?atualizar_cpf|FUNCTION treino\.atualizar_cpf[\s\S]*?SECURITY DEFINER/)
  })

  it('cpf: o banco valida o CPF (CHECK com treino.cpf_valido)', () => {
    expect(semComentarios).toMatch(/CHECK \(cpf IS NULL OR treino\.cpf_valido\(cpf\)\)/)
  })
})
