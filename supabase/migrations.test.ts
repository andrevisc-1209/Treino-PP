import fs from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'
import { PRIVACIDADE_VERSAO, TERMOS_USO_VERSAO } from '../src/features/legal/textos'
import { TERMO_VERSAO } from '../src/features/alunos/termo'

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

  it('toda constraint NOT VALID é validada numa migration posterior (VALIDATE CONSTRAINT)', () => {
    const naoValidas = [...semComentarios.matchAll(/ADD CONSTRAINT (\w+)[^;]*?NOT VALID/g)].map((m) => m[1])
    expect(naoValidas.length).toBeGreaterThan(40)
    for (const nome of naoValidas) {
      expect(semComentarios, nome).toMatch(new RegExp(`VALIDATE CONSTRAINT ${nome};`))
    }
  })

  it.each([
    ['termos', TERMOS_USO_VERSAO],
    ['privacidade', PRIVACIDADE_VERSAO],
    ['consentimento_saude', TERMO_VERSAO],
  ])('versão atual do documento "%s" (%s) está em documentos_versoes (publicou texto novo? falta a migration que registra a versão)', (tipo, versao) => {
    expect(semComentarios).toMatch(new RegExp(`\\('${tipo}',\\s*'${versao.replace('.', '\\.')}'\\)`))
  })

  it('aceites_termos: o cliente não insere (só a RPC registrar_aceite_termos)', () => {
    expect(semComentarios).toMatch(/DROP POLICY IF EXISTS aceites_termos_self_insert/)
    expect(semComentarios).toMatch(/REVOKE INSERT ON treino\.aceites_termos FROM authenticated/)
    expect(semComentarios).toMatch(/GRANT EXECUTE ON FUNCTION treino\.registrar_aceite_termos\(TEXT, TEXT\) TO authenticated/)
  })

  it('consentimentos: sem policy FOR ALL, sem method link para o cliente, UPDATE só em revoked_at', () => {
    expect(semComentarios).toMatch(/DROP POLICY IF EXISTS consentimentos_own/)
    expect(semComentarios).toMatch(/method IN \('app', 'papel'\)/)
    expect(semComentarios).toMatch(/GRANT UPDATE \(revoked_at\) ON treino\.consentimentos TO authenticated/)
    expect(semComentarios).not.toMatch(/GRANT[^;]*DELETE[^;]*ON treino\.consentimentos TO authenticated/)
  })

  it('saúde: trigger exige consentimento ativo para dado clínico e a policy de pesos também', () => {
    expect(semComentarios).toMatch(/CREATE TRIGGER tg_exigir_consentimento_saude\s+BEFORE INSERT OR UPDATE ON treino\.alunos/)
    expect(semComentarios).toMatch(/GRANT EXECUTE ON FUNCTION treino\.aluno_tem_consentimento\(UUID\) TO authenticated/)
    expect(semComentarios).toMatch(/REVOKE ALL ON FUNCTION treino\.aluno_tem_consentimento\(UUID\) FROM PUBLIC, anon/)
    expect(semComentarios).toMatch(/CREATE POLICY pesos_own[\s\S]*?treino\.aluno_tem_consentimento\(aluno_id\)/)
    for (const coluna of ['injury', 'injury_regions', 'injury_notes', 'surgery', 'surgery_regions', 'surgery_notes', 'medications', 'height_cm']) {
      expect(semComentarios, coluna).toMatch(new RegExp(`NEW\\.${coluna}\\b`))
    }
  })

  describe('modo leitura (assinatura imposta pelo banco)', () => {
    const arquivo = fs.readFileSync(path.join(DIR, '20261052000000_assinatura_no_servidor.sql'), 'utf8').replace(/--[^\n]*/g, '')
    const listas = [...arquivo.matchAll(/ARRAY\[([^\]]*)\]/g)].map((m) => [...m[1].matchAll(/'(\w+)'/g)].map((x) => x[1]))
    const [insertUpdate, soInsert] = listas

    it('as tabelas de dados do personal têm policy restritiva de INSERT e UPDATE; consentimentos e execuções só de INSERT', () => {
      for (const t of ['alunos', 'aluno_cobranca', 'aulas', 'aula_participantes', 'planos', 'plano_exercicios', 'modelos', 'sessoes', 'sessao_series', 'faturas', 'pesos', 'professional_config', 'exercicios']) {
        expect(insertUpdate, t).toContain(t)
      }
      expect(soInsert.sort()).toEqual(['consentimentos', 'execucoes_assincrono'])
    })

    it('as exceções continuam livres: perfil, notificações, assinaturas e aceites de termos', () => {
      for (const t of ['professionals', 'notificacoes_professor', 'assinaturas', 'aceites_termos']) {
        expect([...insertUpdate, ...soInsert], t).not.toContain(t)
      }
    })

    it('toda tabela da lista existe nas migrations e as policies são RESTRITIVAS (não substituem as existentes)', () => {
      for (const t of [...insertUpdate, ...soInsert]) expect(tabelas, t).toContain(t)
      expect(arquivo).toMatch(/AS RESTRICTIVE FOR INSERT/)
      expect(arquivo).toMatch(/AS RESTRICTIVE FOR UPDATE/)
      expect(arquivo).not.toMatch(/DROP POLICY IF EXISTS \w+_own/)
    })

    it('assinatura_ativa usa o relógio do servidor e a regra do front; revogar_consentimento não depende da assinatura', () => {
      expect(arquivo).toMatch(/a\.status = 'trial' AND a\.trial_fim > now\(\)/)
      expect(arquivo).toMatch(/a\.status = 'ativa' AND \(a\.assinatura_fim IS NULL OR a\.assinatura_fim > now\(\)\)/)
      const rpc = arquivo.slice(arquivo.indexOf('FUNCTION treino.revogar_consentimento'))
      expect(rpc).not.toMatch(/assinatura_ativa/)
      expect(arquivo).toMatch(/GRANT EXECUTE ON FUNCTION treino\.revogar_consentimento\(UUID\) TO authenticated/)
      expect(arquivo).toMatch(/REVOKE ALL ON FUNCTION treino\.revogar_consentimento\(UUID\) FROM PUBLIC, anon/)
    })
  })
})
