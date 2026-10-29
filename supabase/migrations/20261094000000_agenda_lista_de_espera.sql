-- ============================================================
-- Migration: 20261094000000_agenda_lista_de_espera.sql
--
-- Agenda, fase 3: lista de espera da página pública.
--   treino.lista_espera_agenda : quem pediu para ser avisado se abrir uma vaga (nome, telefone, dia e turno desejados). Só a Edge Function
--                                "agenda-publica" insere (service_role). O personal lê, marca "chamado" e remove; quem avisa é ELE, pelo
--                                WhatsApp (a plataforma não manda mensagem sozinha ao visitante).
-- Dados de VISITANTES (ainda não alunos): o personal é o controlador; a administração nunca os vê (nenhuma função admin_* lê esta tabela).
-- A espera vale por 14 dias, ou até o dia pedido passar (job: supabase/cron/lista_espera.sql, rodar UMA vez no SQL Editor).
-- Também registra a Política de Privacidade 1.14 em treino.documentos_versoes.
-- Reversão: DROP TABLE treino.lista_espera_agenda;
-- ============================================================

BEGIN;

CREATE TABLE treino.lista_espera_agenda (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  professional_id     UUID NOT NULL REFERENCES treino.professionals(id) ON DELETE CASCADE,
  visitante_nome      TEXT NOT NULL CHECK (char_length(visitante_nome) BETWEEN 2 AND 80),
  visitante_telefone  TEXT NOT NULL CHECK (visitante_telefone ~ '^[0-9]{10,13}$'),
  data                DATE NOT NULL,
  turno               TEXT NOT NULL CHECK (turno IN ('manha', 'tarde', 'noite', 'qualquer')),
  chamado_em          TIMESTAMPTZ NULL,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- o mesmo visitante não entra duas vezes na espera do mesmo dia e turno
CREATE UNIQUE INDEX uq_espera_agenda ON treino.lista_espera_agenda(professional_id, visitante_telefone, data, turno);
CREATE INDEX idx_espera_agenda_prof ON treino.lista_espera_agenda(professional_id, data);

ALTER TABLE treino.lista_espera_agenda ENABLE ROW LEVEL SECURITY;

-- o personal lê, apaga e só marca "chamado" (nenhuma outra coluna muda)
GRANT SELECT, DELETE ON treino.lista_espera_agenda TO authenticated;
GRANT UPDATE (chamado_em) ON treino.lista_espera_agenda TO authenticated;
-- a Edge Function agenda-publica insere e lê com service_role (tabela nova não herda esse acesso)
GRANT ALL ON treino.lista_espera_agenda TO service_role;

CREATE POLICY lista_espera_agenda_own ON treino.lista_espera_agenda
  FOR ALL TO authenticated
  USING      (professional_id = (SELECT auth.uid()))
  WITH CHECK (professional_id = (SELECT auth.uid()));

-- marcar como chamado sem assinatura ativa não vale; ler e apagar continuam liberados
CREATE POLICY assinatura_ativa_update ON treino.lista_espera_agenda
  AS RESTRICTIVE FOR UPDATE TO authenticated
  USING (true) WITH CHECK ((SELECT treino.assinatura_ativa()));

INSERT INTO treino.documentos_versoes (tipo, versao) VALUES
  ('privacidade', '1.14')
ON CONFLICT DO NOTHING;

COMMIT;
