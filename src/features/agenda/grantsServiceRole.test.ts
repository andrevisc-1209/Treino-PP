import fs from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'

// Tabela nova do schema treino NÃO herda acesso do service_role (migration 20261044 tirou os privilégios padrão). A Edge Function
// "agenda-publica" usa estas três tabelas; sem o GRANT a leitura falha ("permission denied") e a página pública mostrava "sem horários".
const pasta = path.join(import.meta.dirname, '..', '..', '..', 'supabase', 'migrations')
const sql = fs
  .readdirSync(pasta)
  .filter((f) => f.endsWith('.sql'))
  .map((f) => fs.readFileSync(path.join(pasta, f), 'utf8'))
  .join('\n')

describe('tabelas da agenda pública × acesso do service_role', () => {
  for (const tabela of ['disponibilidade_semanal', 'agenda_bloqueios', 'pedidos_agenda']) {
    it(`${tabela} tem GRANT ao service_role em alguma migration`, () => {
      expect(sql).toMatch(new RegExp(`GRANT\\s+ALL\\s+ON\\s+treino\\.${tabela}\\s+TO\\s+service_role`, 'i'))
    })
  }
})
