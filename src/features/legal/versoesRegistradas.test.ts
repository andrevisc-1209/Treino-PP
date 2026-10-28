import fs from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'
import { PRIVACIDADE_VERSAO, TERMOS_USO_VERSAO } from './textos'

// O servidor só aceita cadastro com versão listada em treino.documentos_versoes. Se alguém muda o texto e a versão sem escrever a migration
// que a registra, o cadastro novo é recusado em produção. Este teste pega isso antes do merge.
const pasta = path.join(import.meta.dirname, '..', '..', '..', 'supabase', 'migrations')
const sql = fs
  .readdirSync(pasta)
  .filter((f) => f.endsWith('.sql'))
  .map((f) => fs.readFileSync(path.join(pasta, f), 'utf8'))
  .join('\n')

describe('versões dos documentos legais × migrations', () => {
  it('a versão atual dos Termos está registrada em alguma migration', () => {
    expect(sql).toContain(`('termos', '${TERMOS_USO_VERSAO}')`)
  })
  it('a versão atual da Política está registrada em alguma migration', () => {
    expect(sql).toContain(`('privacidade', '${PRIVACIDADE_VERSAO}')`)
  })
})
